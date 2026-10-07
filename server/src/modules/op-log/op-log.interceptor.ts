// 管理端操作日志拦截器 —— 统一记录后台写操作，不在各业务 service 里散落埋点
// 只记 /mgmt/* 下的写方法，且必须已通过 AdminGuard（req.admin 存在），
// 故登录失败一类未认证请求不会进来，也不会产生匿名噪声
import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common'
import { Observable, tap } from 'rxjs'
import type { CurrentAdminInfo, RequestWithAdmin } from '../../common/guards/admin.guard'
import { OP_LOG_RESULT } from '../../common/enums'
import { lookupOpLogMeta } from './op-log-catalog'
import { OpLogService } from './op-log.service'

/** 需要记录的写方法 */
const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

/** 管理端路径前缀（已去掉全局 api 前缀） */
const MGMT_PREFIX = '/mgmt/'

/** 全局前缀，req.path 上带着它 */
const GLOBAL_PREFIX = '/api'

/**
 * 不记入操作日志的写接口（SRS 3.5.18）
 * 退出登录挂了 AdminGuard 以吊销令牌，能取到操作人，不显式排除就会被记成一条「其他」
 */
const SKIP_PATHS = new Set(['POST /mgmt/auth/logout'])

/**
 * 脱敏字段名（小写比较）
 * 命中即替换成固定串，绝不能把密码、令牌原样落进审计表——
 * 审计表本身是可被查询导出的，落进去等于多了一处明文泄露点
 *
 * `code` 故意留得宽：多脱一个业务编码只是少看到一个细节，
 * 漏脱一个验证码却是明文泄露，两种错的代价不对等
 */
const REDACT_KEYS = new Set([
  'password', 'oldpassword', 'newpassword', 'confirmpassword',
  'passwordhash', 'token', 'accesstoken', 'refreshtoken', 'secret', 'code', 'captcha', 'smscode',
])

/** 脱敏后的占位串 */
const REDACTED = '***'

/** 递归脱敏的最大层数，超出丢弃 */
const MAX_REDACT_DEPTH = 5
const DEEP_OMITTED = '(层级过深已省略)'

/**
 * 按字符数截断，并去掉尾部的孤立代理对
 * emoji 等增补字符在 JS 里占两个码元，正好截在中间会留下半个字符。
 * 轻则落库变成替换字符（乱码），严格配置下可能整条写入失败——
 * 而写入异常在 service 内被吞成 warn，那就等于这条审计彻底丢了
 * @param text 原始串
 * @param limit 字符数上限
 */
function cut(text: string, limit: number): string {
  return text.slice(0, limit).replace(/[\uD800-\uDBFF]$/, '')
}

/** 参数快照的字符数上限，超出截断；富文本正文可能上万字，全量落库会撑爆日志表 */
const PARAMS_LIMIT = 1000

/** 失败原因的字符数上限，与实体列宽一致 */
const ERROR_LIMIT = 300

/** 动作名与路径的字符数上限，与实体列宽一致；改列宽须同步改这里 */
const ACTION_LIMIT = 100
const PATH_LIMIT = 200

/** 业务成功的响应码 */
const SUCCESS_CODE = 200

/**
 * 从响应值里识别业务失败
 * 后台不少接口用 `raw(null, '原密码错误', 400)` 表失败而非抛异常，
 * 只看有没有抛异常会把这些操作记成成功——审计表里「重置密码 成功」而实际没改，
 * 比没有日志更误导
 *
 * 判的是统一信封的 code 而非 `raw()` 的 `__raw` 标记：本拦截器由 APP_INTERCEPTOR 注册，
 * 位置在 main.ts 里 useGlobalInterceptors 挂的 TransformInterceptor **之外**，
 * 拿到的已是拆过封的 `{ code, message, data }`，`__raw` 那时已被剥掉
 * @param value 响应值
 */
function businessError(value: unknown): string | null {
  if (typeof value !== 'object' || value === null) return null
  const env = value as { code?: unknown; message?: unknown }
  if (typeof env.code !== 'number' || env.code === SUCCESS_CODE) return null
  return typeof env.message === 'string' && env.message ? env.message : `业务码 ${env.code}`
}

/**
 * 递归脱敏
 * @param value 任意请求参数
 * @param depth 当前深度，防御深层嵌套导致的栈溢出
 */
function redact(value: unknown, depth = 0): unknown {
  if (value === null || typeof value !== 'object') return value
  // 超出深度直接丢弃而不是原样返回：原样返回等于把更深层未经脱敏的内容放了进来
  if (depth > MAX_REDACT_DEPTH) return DEEP_OMITTED
  if (Array.isArray(value)) return value.map(v => redact(v, depth + 1))
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = REDACT_KEYS.has(k.toLowerCase()) ? REDACTED : redact(v, depth + 1)
  }
  return out
}

/**
 * 请求参数快照：合并 query 与 body，脱敏后序列化并截断
 * @param req 请求对象
 */
function buildParams(req: RequestWithAdmin): string | null {
  const query = req.query && Object.keys(req.query).length ? req.query : undefined
  // multipart 上传的 body 是文件流，不落快照，只在 query 有内容时记 query
  const body = req.is?.('multipart/form-data') ? undefined : req.body
  const hasBody = body && typeof body === 'object' && Object.keys(body as object).length > 0
  if (!query && !hasBody) return null
  try {
    const snapshot = redact({ ...(query ? { query } : {}), ...(hasBody ? { body } : {}) })
    const text = JSON.stringify(snapshot)
    return text.length > PARAMS_LIMIT ? `${cut(text, PARAMS_LIMIT)}…(已截断)` : text
  } catch {
    // 循环引用等无法序列化的情形，留痕但不记内容
    return '(参数无法序列化)'
  }
}

@Injectable()
export class OpLogInterceptor implements NestInterceptor {
  constructor(private readonly opLog: OpLogService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    // 非 HTTP 上下文（如定时任务）直接放过
    if (context.getType() !== 'http') return next.handle()

    const req = context.switchToHttp().getRequest<RequestWithAdmin>()
    const method = (req.method || '').toUpperCase()
    // 去掉全局前缀，使目录表的键不必带 /api
    const rawPath = (req.path || '').split('?')[0]
    // 再去掉末尾斜杠：Express 默认对尾斜杠宽松路由，不规整的话 `/logout/` 会绕过排除表与目录表
    const path = (rawPath.startsWith(GLOBAL_PREFIX) ? rawPath.slice(GLOBAL_PREFIX.length) : rawPath).replace(/(.)\/+$/, '$1')

    // admin 取成局部常量再判空，才能让类型收窄传进下面的闭包
    const admin = req.admin
    if (!admin || !WRITE_METHODS.has(method) || !path.startsWith(MGMT_PREFIX) || SKIP_PATHS.has(`${method} ${path}`)) {
      return next.handle()
    }

    // 处理器可能改写 req.body（如 DTO 转换），故在放行前先取快照
    const params = buildParams(req)
    const ip = req.ip ?? null

    return next.handle().pipe(
      tap({
        next: (value: unknown) => {
          const bizError = businessError(value)
          void this.record(
            admin, method, path, params, ip,
            bizError ? OP_LOG_RESULT.FAILURE : OP_LOG_RESULT.SUCCESS,
            bizError ? cut(bizError, ERROR_LIMIT) : null,
          )
        },
        error: (err: unknown) => {
          const message = err instanceof Error ? err.message : String(err)
          void this.record(
            admin, method, path, params, ip,
            OP_LOG_RESULT.FAILURE, cut(message, ERROR_LIMIT),
          )
        },
      }),
    )
  }

  /**
   * 落一条日志
   * 不 await：审计不应拖慢响应，写入异常已在 service 内部吞掉
   */
  private record(
    admin: CurrentAdminInfo,
    method: string,
    path: string,
    params: string | null,
    ip: string | null,
    result: typeof OP_LOG_RESULT[keyof typeof OP_LOG_RESULT],
    errorMessage: string | null,
  ): Promise<void> {
    const meta = lookupOpLogMeta(method, path)
    return this.opLog.write({
      adminId: admin.id,
      adminAccount: admin.account,
      adminName: admin.name ?? null,
      // 未收录路径的 action 兜底成 "METHOD 路径"，长路径可能超列宽；
      // MySQL 严格模式下超长是整条写入失败（异常被 service 吞掉），故按列宽先截
      action: cut(meta.action, ACTION_LIMIT),
      module: meta.module,
      method,
      path: cut(path, PATH_LIMIT),
      params,
      ip,
      result,
      errorMessage,
    })
  }
}
