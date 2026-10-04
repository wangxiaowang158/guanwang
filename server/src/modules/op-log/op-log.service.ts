// 管理端操作日志服务 —— 写入审计记录、后台查询、按日期清理
import { BadRequestException, Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { LessThan, Repository } from 'typeorm'
import { AdminOpLog } from './op-log.entity'
import { OP_LOG_RESULT, type OpLogResult } from '../../common/enums'
import { resolvePaging } from '../../common/pagination'

/** 写入日志的入参 */
export interface WriteOpLogInput {
  adminId: number
  adminAccount: string
  adminName: string | null
  action: string
  module: string
  method: string
  path: string
  params: string | null
  ip: string | null
  result: OpLogResult
  errorMessage?: string | null
}

/** 后台查询条件 */
export interface OpLogQuery {
  keyword?: string
  module?: string
  result?: OpLogResult
  startDate?: string
  endDate?: string
  page?: number
  pageSize?: number
}

/** 日期格式：YYYY-MM-DD */
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/

/** 每页条数默认值与上限，与其余后台列表保持一致 */
const DEFAULT_PAGE_SIZE = 10
const MAX_PAGE_SIZE = 100

/**
 * LIKE 的转义符
 * 不用反斜杠：SQLite 的 LIKE 没有默认转义符，而 MySQL 与 SQLite 对字符串里的
 * 反斜杠字面量处理也不一致；取 `!` 可在两种方言下写法一致，配合 ESCAPE 子句使用
 */
const LIKE_ESCAPE = '!'

/**
 * 转义 LIKE 的通配符
 * 参数化已挡注入，但 `%` / `_` 会被当模式符，搜「50%」会变成搜「50 开头的任意串」
 * @param text 用户输入的关键词
 */
function escapeLike(text: string): string {
  return text.replace(/[!%_]/g, ch => `${LIKE_ESCAPE}${ch}`)
}

/**
 * 解析 `YYYY-MM-DD` 为日期，非法则返回 null
 * 越界日期（如 2026-99-99）能过正则但解析为 Invalid Date，拼进 SQL 会报错
 * @param date 日期串
 * @param timeSuffix 拼接的时间部分，如 `T00:00:00`
 */
function parseDate(date: string | undefined, timeSuffix: string): Date | null {
  if (!date || !DATE_ONLY_PATTERN.test(date)) return null
  const d = new Date(`${date}${timeSuffix}`)
  return Number.isNaN(d.getTime()) ? null : d
}

@Injectable()
export class OpLogService {
  private readonly logger = new Logger(OpLogService.name)

  constructor(
    @InjectRepository(AdminOpLog) private readonly repo: Repository<AdminOpLog>,
  ) {}

  /**
   * 写入一条操作日志
   * 审计失败绝不能反过来影响业务：异常一律吞掉转 warn，
   * 否则日志表写不动会把整个后台变成不可用
   * @param input 日志内容
   */
  async write(input: WriteOpLogInput): Promise<void> {
    try {
      await this.repo.save(
        this.repo.create({
          ...input,
          errorMessage:
            input.result === OP_LOG_RESULT.FAILURE ? (input.errorMessage ?? null) : null,
        }),
      )
    } catch (e) {
      this.logger.warn(`操作日志写入失败：${e instanceof Error ? e.message : String(e)}`)
    }
  }

  /**
   * 后台分页查询
   * @param query 查询条件
   */
  async list(query: OpLogQuery) {
    // DTO 层已拒掉非法值，这里仍走一遍清洗：service 也被内部调用，
    // 不能假定入参一定过了 ValidationPipe
    const { page, pageSize, skip } = resolvePaging(query.page, query.pageSize, {
      defaultSize: DEFAULT_PAGE_SIZE,
      maxSize: MAX_PAGE_SIZE,
    })

    const qb = this.repo.createQueryBuilder('log')
    if (query.keyword?.trim()) {
      qb.andWhere(
        `(log.adminAccount LIKE :kw ESCAPE '${LIKE_ESCAPE}'`
        + ` OR log.adminName LIKE :kw ESCAPE '${LIKE_ESCAPE}'`
        + ` OR log.action LIKE :kw ESCAPE '${LIKE_ESCAPE}'`
        + ` OR log.ip LIKE :kw ESCAPE '${LIKE_ESCAPE}')`,
        { kw: `%${escapeLike(query.keyword.trim())}%` },
      )
    }
    if (query.module) qb.andWhere('log.module = :module', { module: query.module })
    if (query.result) qb.andWhere('log.result = :result', { result: query.result })

    const range = this.buildDateRange(query.startDate, query.endDate)
    if (range) qb.andWhere('log.createdAt BETWEEN :from AND :to', range)

    const [rows, total] = await qb
      .orderBy('log.id', 'DESC')
      .skip(skip)
      .take(pageSize)
      .getManyAndCount()

    return { list: rows, total, page, pageSize }
  }

  /**
   * 清理指定日期之前的日志
   * @param beforeDate `YYYY-MM-DD`，该日零点之前的记录被删除
   * @returns 删除条数
   */
  async clearBefore(beforeDate: string): Promise<number> {
    // 定时任务等非 HTTP 入口不过 DTO 校验，故服务层自己再挡一道，
    // 避免拼进 SQL 的日期串失控
    if (!DATE_ONLY_PATTERN.test(beforeDate)) {
      throw new BadRequestException('日期格式不正确')
    }
    // 正则只管形状，2026-99-99 这类月日越界仍能通过，需再确认能解析成真实日期
    const before = new Date(`${beforeDate}T00:00:00`)
    if (Number.isNaN(before.getTime())) {
      throw new BadRequestException('日期不存在')
    }
    const result = await this.repo.delete({ createdAt: LessThan(before) })
    return result.affected ?? 0
  }

  /**
   * 把 `YYYY-MM-DD` 区间转成含当日全天的时间区间
   * @param startDate 起始日期
   * @param endDate 结束日期
   */
  private buildDateRange(startDate?: string, endDate?: string): { from: Date; to: Date } | null {
    if (!startDate && !endDate) return null
    const from = parseDate(startDate, 'T00:00:00') ?? new Date('1970-01-01T00:00:00')
    // 结束日期取当日 23:59:59，否则选同一天会查不到任何记录
    const to = parseDate(endDate, 'T23:59:59') ?? new Date('9999-12-31T23:59:59')
    return { from, to }
  }
}
