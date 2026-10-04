// 素材库冒烟 —— 起真实应用，验证列表/筛选/分页/引用保护/路径穿越拦截
//
// 单独一支脚本而非并进 smoke-member：素材库要在磁盘上造文件、改库里的引用，
// 混进会员冒烟会让两边的前置数据互相干扰。
import 'reflect-metadata'
import { access, mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { config } from 'dotenv'
import { say } from './report'
import type { MediaService } from '../modules/upload/media.service'

/** 服务类型别名，供各检查段落标注参数类型 */
type MediaSvc = MediaService

/** 仅用到 get 的应用上下文，避免为脚本引入完整 Nest 类型 */
interface NestContext {
  get<T>(token: unknown): T
}

/** 仅用到 query 的数据源 */
interface DataSourceLike {
  query(sql: string, params?: unknown[]): Promise<unknown>
}

/** 上传根目录，读 env 后计算，与服务端取值一致 */
function uploadRoot(): string {
  return join(process.cwd(), process.env.UPLOAD_DIR as string)
}

/** SQLite 的 datetime 字面量 */
function nowSql(): string {
  return new Date().toISOString().slice(0, 19).replace('T', ' ')
}

config()

/** 本脚本独占的数据文件，与其他冒烟脚本同放 data/ 下便于一并清理 */
const SMOKE_DB = 'data/smoke-media.sqlite'

/**
 * 独占一份数据文件与上传目录，不污染开发库
 * sqlite 的路径变量是 DB_SQLITE_PATH，DB_DATABASE 只对 MySQL 生效 ——
 * 写错这个名字不会报错，只会静默落到开发库上（见 config/app.config.ts）
 */
process.env.DB_TYPE = 'sqlite'
process.env.DB_SQLITE_PATH = SMOKE_DB
process.env.DB_SYNCHRONIZE = 'true'
process.env.UPLOAD_DIR = 'data/uploads-smoke-media'

let passed = 0
let failed = 0

/**
 * 断言并计数
 * @param name 断言描述
 * @param ok 是否通过
 * @param extra 失败时附带的诊断信息
 */
function check(name: string, ok: boolean, extra?: unknown): void {
  if (ok) {
    passed++
    say(`  ✅ ${name}`)
    return
  }
  failed++
  say(`  ❌ ${name}`, extra ?? '')
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})

async function main(): Promise<void> {
  await rm(SMOKE_DB, { force: true })

  const { NestFactory } = await import('@nestjs/core')
  const { AppModule } = await import('../app.module')
  const { MediaService } = await import('../modules/upload/media.service')
  const { uploadRootDir } = await import('../modules/upload/upload.storage')

  const app = await NestFactory.createApplicationContext(AppModule, { logger: false })
  const media = app.get(MediaService)
  // 上传根目录以 env 的 UPLOAD_DIR 为准，与服务端同一套解析
  const rootDir = uploadRootDir()

  try {
    await prepareFiles(rootDir)
    await runListChecks(media)
    await runDeleteChecks(media, app as NestContext)
    // 权限校验要另起一个 HTTP 应用，放在最后以免其守卫日志混进前面的输出
    await runPermChecks()
  } finally {
    await app.close()
    await rm(rootDir, { recursive: true, force: true })
    await rm(SMOKE_DB, { force: true })
  }

  say('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  say(`素材库冒烟：通过 ${passed}，失败 ${failed}`)
  say('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  if (failed > 0) process.exit(1)
}

/** 造测试素材：两张图、一个视频、一个其他类型，其中一张图人为改旧以退出保护期 */
async function prepareFiles(rootDir: string): Promise<void> {
  const bucket = join(rootDir, '202601')
  await mkdir(bucket, { recursive: true })
  await writeFile(join(bucket, 'old-referenced.jpg'), Buffer.alloc(3000))
  await writeFile(join(bucket, 'old-orphan.png'), Buffer.alloc(1000))
  await writeFile(join(bucket, 'clip.mp4'), Buffer.alloc(5000))
  await writeFile(join(bucket, 'doc.pdf'), Buffer.alloc(200))

  // 把 mtime 推到 48 小时前，使其退出 24 小时保护期
  const { utimes } = await import('node:fs/promises')
  const old = new Date(Date.now() - 48 * 60 * 60 * 1000)
  for (const name of ['old-referenced.jpg', 'old-orphan.png', 'clip.mp4', 'doc.pdf']) {
    await utimes(join(bucket, name), old, old)
  }
  // 再造一个刚写入的文件，用于验证保护期标记
  await writeFile(join(bucket, 'fresh.webp'), Buffer.alloc(100))
}

/** 列表、筛选、排序、分页与统计 */
async function runListChecks(media: MediaSvc): Promise<void> {
  say('\n【素材列表】')
  const all = await media.list({})
  check('列出磁盘全部素材', all.total === 5, all.total)
  check('默认每页 24 条', all.pageSize === 24, all.pageSize)
  check(
    '统计分类正确（图 3 / 视频 1 / 其他 1）',
    all.stat.image === 3 && all.stat.video === 1 && all.stat.other === 1,
    all.stat,
  )
  check('月份分桶已解析', all.list.every((i) => i.bucket === '202601'), all.list[0])
  check(
    'URL 为站内可访问地址',
    all.list.every((i) => i.url.startsWith('/uploads/202601/')),
    all.list[0]?.url,
  )

  say('\n【筛选与排序】')
  const images = await media.list({ type: 'image' })
  check('按图片类型筛选', images.total === 3, images.total)
  const videos = await media.list({ type: 'video' })
  check('按视频类型筛选', videos.total === 1 && videos.list[0].name === 'clip.mp4', videos.list)
  const kw = await media.list({ keyword: 'ORPHAN' })
  check('关键词忽略大小写', kw.total === 1 && kw.list[0].name === 'old-orphan.png', kw.list)

  const bySize = await media.list({ sortBy: 'size', sortOrder: 'desc' })
  check('按大小倒序', bySize.list[0].name === 'clip.mp4', bySize.list.map((i) => i.name))
  const bySizeAsc = await media.list({ sortBy: 'size', sortOrder: 'asc' })
  check('按大小正序', bySizeAsc.list[0].name === 'fresh.webp', bySizeAsc.list.map((i) => i.name))

  say('\n【分页】')
  const p1 = await media.list({ page: 1, pageSize: 2 })
  const p2 = await media.list({ page: 2, pageSize: 2 })
  check('每页条数生效', p1.list.length === 2, p1.list.length)
  check('总数不随分页变化', p1.total === 5 && p2.total === 5, [p1.total, p2.total])
  check(
    '两页内容不重复',
    !p1.list.some((a) => p2.list.some((b) => b.url === a.url)),
    [p1.list.map((i) => i.name), p2.list.map((i) => i.name)],
  )
  const over = await media.list({ page: 1, pageSize: 9999 })
  check('每页条数被夹到上限 100', over.pageSize === 100, over.pageSize)
  const bad = await media.list({ page: -3, pageSize: 0 })
  check('非法分页参数回落默认值', bad.page === 1 && bad.pageSize === 24, [bad.page, bad.pageSize])
}

/**
 * 捕获调用抛出的异常信息，未抛则返回 null
 * @param run 待执行的操作
 */
async function catchError(run: () => Promise<unknown>): Promise<string | null> {
  try {
    await run()
    return null
  } catch (err) {
    return (err as { message?: string }).message ?? String(err)
  }
}

/** 引用保护、保护期标记、路径穿越拦截与真实删除 */
async function runDeleteChecks(media: MediaSvc, app: NestContext): Promise<void> {
  const { getDataSourceToken } = await import('@nestjs/typeorm')
  const ds = app.get<DataSourceLike>(getDataSourceToken())

  // 造一条内容记录引用 old-referenced.jpg，模拟「线上正在用这张图」
  await ds.query(
    `INSERT INTO content (channelKey, title, cover, status, sort, isTop, createdAt, updatedAt)
     VALUES ('smoke', '冒烟内容', '/uploads/202601/old-referenced.jpg', 'published', 0, 0, ?, ?)`,
    [nowSql(), nowSql()],
  )

  say('\n【引用判定】')
  const listed = await media.list({})
  const referenced = listed.list.find((i) => i.name === 'old-referenced.jpg')
  const orphan = listed.list.find((i) => i.name === 'old-orphan.png')
  const fresh = listed.list.find((i) => i.name === 'fresh.webp')
  check('被内容引用的素材标记为已引用', referenced?.referenced === true, referenced)
  check('无人引用的素材标记为未引用', orphan?.referenced === false, orphan)
  check('刚上传的文件带保护期标记', fresh?.recent === true, fresh)
  check('过期文件无保护期标记', orphan?.recent === false, orphan)

  const unused = await media.list({ unusedOnly: true })
  check(
    '「只看未引用」排除已引用与保护期内的文件',
    unused.list.every((i) => !i.referenced && !i.recent) &&
      !unused.list.some((i) => i.name === 'fresh.webp' || i.name === 'old-referenced.jpg'),
    unused.list.map((i) => i.name),
  )

  say('\n【删除保护】')
  const refErr = await catchError(() => media.remove('/uploads/202601/old-referenced.jpg'))
  check('仍被引用的素材拒绝删除', refErr?.includes('仍被') === true, refErr)
  await access(join(uploadRoot(), '202601', 'old-referenced.jpg'))
  check('拒绝删除后文件仍在磁盘上', true)

  const missErr = await catchError(() => media.remove('/uploads/202601/not-exist.jpg'))
  check('删除不存在的素材返回未找到', missErr?.includes('不存在') === true, missErr)

  say('\n【路径穿越拦截】')
  const traversals = [
    '/uploads/../../../etc/passwd',
    '/uploads/202601/../../../../etc/passwd',
    '/uploads/%2e%2e%2f%2e%2e%2fetc/passwd',
    '/etc/passwd',
    'uploads/202601/old-orphan.png',
    '/uploads/',
    '/uploads/.',
  ]
  for (const path of traversals) {
    const err = await catchError(() => media.remove(path))
    check(`拦截越界路径 ${path}`, err !== null && !err.includes('删除失败'), err)
  }

  say('\n【正常删除】')
  const removed = await media.remove('/uploads/202601/old-orphan.png')
  check('删除未引用素材成功', removed.url === '/uploads/202601/old-orphan.png', removed)
  const gone = await catchError(() => access(join(uploadRoot(), '202601', 'old-orphan.png')))
  check('文件已从磁盘移除', gone !== null)
  const after = await media.list({})
  check('列表总数随之减少', after.total === 4, after.total)
}

/**
 * 权限分档验证：列表仅需登录、删除需素材库权限
 * 走真实 HTTP 而非直调 service——两档权限是守卫层的行为，service 里看不出来
 */
async function runPermChecks(): Promise<void> {
  say('\n【权限分档】')
  const { NestFactory } = await import('@nestjs/core')
  const { AppModule } = await import('../app.module')
  const { TransformInterceptor } = await import('../common/interceptors/transform.interceptor')
  const { AllExceptionFilter } = await import('../common/filters/all-exception.filter')
  const { ValidationPipe } = await import('@nestjs/common')

  const app = await NestFactory.create(AppModule, { logger: false })
  app.setGlobalPrefix('api')
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))
  app.useGlobalInterceptors(new TransformInterceptor())
  app.useGlobalFilters(new AllExceptionFilter())
  await app.listen(0)
  const base = (await app.getUrl()).replace('[::1]', '127.0.0.1')

  /** 发起请求并解出统一响应体 */
  const call = async (method: string, path: string, token?: string, body?: unknown) => {
    const res = await fetch(`${base}/api${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    return (await res.json()) as { code: number; message?: string; data?: unknown }
  }

  try {
    const { ADMIN_SEED } = await import('../config/app.config')
    const login = await call('POST', '/mgmt/auth/login', undefined, {
      username: ADMIN_SEED.account,
      password: ADMIN_SEED.password,
    })
    const superToken = (login.data as { token?: string })?.token
    check('超管登录成功', typeof superToken === 'string', login)

    // 造一个无任何权限的普通管理员，模拟「能编辑内容但没有素材库菜单」
    const created = await call('POST', '/mgmt/admin/add', superToken, {
      account: 'media_probe',
      name: '素材库探针',
      password: 'Probe12345',
      perms: [],
    })
    check('普通管理员已创建', created.code === 200, created)
    const plainLogin = await call('POST', '/mgmt/auth/login', undefined, {
      username: 'media_probe',
      password: 'Probe12345',
    })
    const plainToken = (plainLogin.data as { token?: string })?.token

    const anon = await call('GET', '/mgmt/media/list')
    check('未登录读取素材列表被拒', anon.code === 401, anon)

    const plainList = await call('GET', '/mgmt/media/list', plainToken)
    check('无素材库权限也能读列表（供内容页选素材）', plainList.code === 200, plainList)

    const plainDel = await call('DELETE', '/mgmt/media/delete', plainToken, {
      url: '/uploads/202601/clip.mp4',
    })
    check('无素材库权限删除被拒 403', plainDel.code === 403, plainDel)

    const superDel = await call('DELETE', '/mgmt/media/delete', superToken, {
      url: '/uploads/202601/clip.mp4',
    })
    check('超管可删除未引用素材', superDel.code === 200, superDel)

    const emptyUrl = await call('DELETE', '/mgmt/media/delete', superToken, { url: '' })
    check('删除接口拒绝空地址', emptyUrl.code === 400, emptyUrl)

    const badType = await call('GET', '/mgmt/media/list?type=exe', superToken)
    check('非法类型参数被拒', badType.code === 400, badType)

    // 操作日志应留痕，且记成「素材库 / 删除素材」
    const logs = await call('GET', '/mgmt/op-log/list?page=1&pageSize=20', superToken)
    const rows = (logs.data as { list?: Array<{ module: string; action: string }> })?.list ?? []
    check(
      '删除素材已记入操作日志',
      rows.some((r) => r.module === '素材库' && r.action === '删除素材'),
      rows.map((r) => `${r.module}/${r.action}`),
    )
  } finally {
    await app.close()
  }
}
