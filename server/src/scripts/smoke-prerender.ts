// 首屏预渲染冒烟 —— 起真实 HTTP 应用，验证片段内容、转义、路径白名单与缓存
//
// 重点不在「有没有输出」，而在三件容易出事的地方：
// 1. 片段是拼字符串生成的 → 库里的文本必须转义，否则是一条打到全站访客的存储型 XSS
// 2. 路径来自外部（网关传的 $request_uri）→ 形态校验挡不住就等于开了任意路径探测口
// 3. 取不到内容时必须是空片段而非错误页 → 否则后端一抖动，用户看见的是错误文本
import 'reflect-metadata'
import { rm } from 'node:fs/promises'
import { config } from 'dotenv'
import { say } from './report'

config()

/** 本脚本独占的数据文件，与其他冒烟脚本同放 data/ 下便于一并清理 */
const SMOKE_DB = 'data/smoke-prerender.sqlite'

/**
 * 独占一份数据文件，不污染开发库
 * sqlite 的路径变量是 DB_SQLITE_PATH，DB_DATABASE 只对 MySQL 生效 ——
 * 写错这个名字不会报错，只会静默落到开发库上（见 config/app.config.ts）
 */
process.env.DB_TYPE = 'sqlite'
process.env.DB_SQLITE_PATH = SMOKE_DB
process.env.DB_SYNCHRONIZE = 'true'

/** 仅用到 query 的数据源 */
interface DataSourceLike {
  query(sql: string, params?: unknown[]): Promise<unknown>
}

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

/** SQLite 的 datetime 字面量 */
function nowSql(): string {
  return new Date().toISOString().slice(0, 19).replace('T', ' ')
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})

async function main(): Promise<void> {
  await rm(SMOKE_DB, { force: true })

  const { NestFactory } = await import('@nestjs/core')
  const { AppModule } = await import('../app.module')
  const { TransformInterceptor } = await import('../common/interceptors/transform.interceptor')
  const { AllExceptionFilter } = await import('../common/filters/all-exception.filter')
  const { ValidationPipe } = await import('@nestjs/common')
  const { getDataSourceToken } = await import('@nestjs/typeorm')

  const app = await NestFactory.create(AppModule, { logger: false })
  app.setGlobalPrefix('api')
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))
  app.useGlobalInterceptors(new TransformInterceptor())
  app.useGlobalFilters(new AllExceptionFilter())
  await app.listen(0)
  const base = (await app.getUrl()).replace('[::1]', '127.0.0.1')

  /** 取片段裸文本。预渲染接口不走统一响应信封，返回的是 HTML */
  const frag = async (path: string): Promise<string> => {
    const res = await fetch(`${base}/api/portal/prerender?path=${encodeURIComponent(path)}`)
    return res.text()
  }

  try {
    const ds = app.get<DataSourceLike>(getDataSourceToken())
    await seed(ds)
    await runContentChecks(frag)
    await runEscapeChecks(frag)
    await runPathChecks(frag, base)
    await runCacheChecks(frag, ds)
  } finally {
    await app.close()
    await rm(SMOKE_DB, { force: true })
  }

  say('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  say(`首屏预渲染冒烟：通过 ${passed}，失败 ${failed}`)
  say('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  if (failed > 0) process.exit(1)
}

/**
 * 造最小数据集：站点信息 + 首页板块 + 一个对外栏目页 + 一篇文章
 * 栏目名里故意埋 `<script>`，用来验证转义
 * @param ds 数据源
 */
async function seed(ds: DataSourceLike): Promise<void> {
  const now = nowSql()

  await ds.query(
    `INSERT OR REPLACE INTO site_config (id, webTitle, description, subSlogan, phone, address, website, updatedAt)
     VALUES (1, ?, ?, ?, ?, ?, ?, ?)`,
    [
      '中瑞恒冒烟站点',
      '国家高新技术企业，智慧能源领域',
      '让建筑更节能',
      '010-00000000',
      '北京市"朝阳区"<测试>',
      'example.com',
      now,
    ],
  )

  /** 插一个栏目 */
  const channel = async (row: Record<string, unknown>) => {
    const cols = ['parentId', 'key', 'name', 'type', 'sort', 'formFields', 'listColumns',
      'portalPath', 'anchor', 'layout', 'heroTitle', 'heroEyebrow', 'heroDesc', 'subheading']
    const values = cols.map(c => row[c] ?? null)
    await ds.query(
      `INSERT INTO channel (${cols.map(c => `"${c}"`).join(', ')}, updatedAt)
       VALUES (${cols.map(() => '?').join(', ')}, ?)`,
      [...values, now],
    )
    const found = (await ds.query('SELECT id FROM channel WHERE "key" = ?', [row.key])) as { id: number }[]
    return found[0].id
  }

  // 首页板块栏目：键名须与 HOME_SECTION_KEYS 一致，否则首页片段取不到内容
  await channel({ key: 'home-intro', name: '公司简介', type: 'single', sort: 1, formFields: '[]', listColumns: '[]' })
  await channel({ key: 'home-business', name: '业务领域', type: 'list', sort: 2, formFields: '[]', listColumns: '[]' })

  // 对外栏目页：栏目名里埋 XSS 载荷
  const newsId = await channel({
    key: 'news', name: '新闻中心', type: 'group', sort: 3, formFields: '[]', listColumns: '[]',
    portalPath: '/news', heroTitle: '新闻<script>alert(1)</script>中心',
    heroEyebrow: 'NEWS', heroDesc: '公司动态与行业政策',
  })
  await channel({
    parentId: newsId, key: 'news-company', name: '公司新闻 & 公告', type: 'list', sort: 1,
    formFields: '[]', listColumns: '[]', anchor: 'company', layout: 'cards', subheading: '最新动态',
  })
  // 不对外的顶级栏目，用于验证「无 portalPath 不给片段」
  await channel({ key: 'banner', name: '头图管理', type: 'group', sort: 9, formFields: '[]', listColumns: '[]' })

  /** 插一条内容 */
  const content = async (row: Record<string, unknown>) => {
    const cols = ['channelKey', 'title', 'name', 'description', 'intro', 'content',
      'author', 'source', 'status', 'sort', 'isTop', 'publishAt']
    const values = cols.map(c => row[c] ?? null)
    await ds.query(
      `INSERT INTO content (${cols.map(c => `"${c}"`).join(', ')}, createdAt, updatedAt)
       VALUES (${cols.map(() => '?').join(', ')}, ?, ?)`,
      [...values, now, now],
    )
  }

  await content({
    channelKey: 'home-intro', title: '公司简介', status: 'published', sort: 1, isTop: 0,
    content: '<p>中瑞恒成立于二〇〇〇年，<strong>专注建筑节能</strong>。</p>', publishAt: now,
  })
  await content({
    channelKey: 'home-business', title: '暖通空调 <b>集成</b>', description: '多联机与冷水机组',
    status: 'published', sort: 1, isTop: 0, publishAt: now,
  })
  await content({
    channelKey: 'news-company', title: '公司获评专精特新', description: '摘要 & 说明',
    content: '<p>正文第一段</p><script>alert("xss")</script><img src="/uploads/a.png" alt="配图">',
    author: '编辑部', source: '官网', status: 'published', sort: 2, isTop: 0, publishAt: now,
  })
  await content({
    channelKey: 'news-company', title: '第二篇新闻', content: '<p>第二篇正文</p>',
    status: 'published', sort: 1, isTop: 0, publishAt: now,
  })
  // 草稿：不该出现在任何片段里
  await content({
    channelKey: 'news-company', title: '未发布的稿子', content: '<p>草稿正文</p>',
    status: 'draft', sort: 3, isTop: 0,
  })
}

/** 片段取数函数签名 */
type FragFn = (path: string) => Promise<string>

/** 首页 / 栏目页 / 文章页的片段内容 */
async function runContentChecks(frag: FragFn): Promise<void> {
  say('\n【首页片段】')
  const home = await frag('/')
  check('输出容器', home.includes('class="prerender-shell"'), home.slice(0, 120))
  check('有 h1 主标题', home.includes('<h1>中瑞恒冒烟站点</h1>'), home.slice(0, 200))
  check('带站点描述', home.includes('国家高新技术企业'), false)
  check('公司简介降级为纯文本', home.includes('专注建筑节能') && !home.includes('<strong>'), false)
  check('业务领域条目已输出', home.includes('暖通空调'), false)
  check('联系信息已输出', home.includes('010-00000000'), false)
  check('含站内导航供抓取方发现其余页面', home.includes('<nav aria-label="主导航"'), false)
  check('导航只含对外栏目（不含头图管理）', !home.includes('头图管理'), false)
  check('/index.html 与 / 同片段', (await frag('/index.html')) === home, false)

  say('\n【栏目页片段】')
  const news = await frag('/news')
  check('Hero 标题输出', news.includes('新闻'), news.slice(0, 200))
  check('Hero 描述输出', news.includes('公司动态与行业政策'), false)
  check('区块带锚点 id', news.includes('id="company"'), false)
  check('区块标题与副标题输出', news.includes('公司新闻') && news.includes('最新动态'), false)
  check('已发布条目输出', news.includes('公司获评专精特新') && news.includes('第二篇新闻'), false)
  check('草稿不出现在片段里', !news.includes('未发布的稿子'), false)
  check('有正文的条目给出详情页链接', /<a href="\/article\/\d+">/.test(news), false)
  check('无 portalPath 的顶级栏目无片段', (await frag('/banner')) === '', false)

  say('\n【文章页片段】')
  const articleId = (news.match(/\/article\/(\d+)/) ?? [])[1]
  check('从栏目页片段里取到文章 id', typeof articleId === 'string', news.slice(0, 300))
  const article = await frag(`/article/${articleId}`)
  check('文章标题为 h1', article.includes('<h1>公司获评专精特新</h1>'), article.slice(0, 200))
  check('正文原样直出（已过白名单）', article.includes('<p>正文第一段</p>'), false)
  check('正文里的 script 已被白名单剥掉', !article.includes('<script'), false)
  check('正文图片与 alt 保留（图片 alt 是 SEO 信息）', article.includes('alt="配图"'), false)
  check('作者与来源输出', article.includes('编辑部') && article.includes('官网'), false)
  check('含面包屑导航', article.includes('aria-label="面包屑"') && article.includes('href="/news"'), false)
  check('含相邻文章导航', article.includes('aria-label="相邻文章"'), false)
  check('不存在的文章无片段', (await frag('/article/999999')) === '', false)
}

/** 转义：库里的文本进片段前必须过 HTML 转义，否则是存储型 XSS */
async function runEscapeChecks(frag: FragFn): Promise<void> {
  say('\n【转义】')
  const news = await frag('/news')
  check(
    '栏目名里的 script 标签被转义而非执行',
    news.includes('&lt;script&gt;') && !news.includes('<script>alert(1)</script>'),
    news.slice(0, 300),
  )

  const home = await frag('/')
  check('地址里的引号被转义', home.includes('&quot;朝阳区&quot;'), false)
  check('地址里的尖括号被转义', home.includes('&lt;测试&gt;'), false)
  check('业务领域标题里的标签被转义', home.includes('&lt;b&gt;'), false)
  check(
    '摘要里的 & 被转义为实体',
    news.includes('&amp;') && !/摘要 & 说明/.test(news),
    false,
  )
}

/** 路径白名单：路径来自外部，形态不对一律空片段 */
async function runPathChecks(frag: FragFn, base: string): Promise<void> {
  say('\n【路径白名单】')
  const cases: Array<[string, string]> = [
    ['/../../etc/passwd', '目录穿越'],
    ['/news/../../etc/passwd', '带正常前缀的穿越'],
    ['/%2e%2e%2f%2e%2e%2fetc/passwd', '编码后的穿越'],
    ['/member/center', '会员中心（要登录态，不预渲染）'],
    ['/privacy', '隐私政策（静态文案，不预渲染）'],
    ['news', '缺前导斜杠'],
    ['/news/extra/deep', '多层路径'],
    ['/NEWS', '大写路径'],
    ['/article/abc', '文章 id 非数字'],
    ['/article/0', '文章 id 为 0'],
    ['/article/-1', '文章 id 为负'],
    ['/%zz', '非法百分号编码'],
    [`/news${'x'.repeat(600)}`, '超长路径'],
  ]
  for (const [path, desc] of cases) {
    check(`${desc} → 空片段`, (await frag(path)) === '', path)
  }

  // 尾斜杠与查询串应命中同一页面
  const news = await frag('/news')
  check('尾斜杠 /news/ 与 /news 同片段', (await frag('/news/')) === news, false)
  check('带查询串 /news?a=1 与 /news 同片段', (await frag('/news?a=1')) === news, false)
  check('带哈希 /news#top 与 /news 同片段', (await frag('/news#top')) === news, false)

  say('\n【入参形态】')
  // path 传成数组（重复传参）时 Express 会给出 string[]，不能当字符串用
  const arrRes = await fetch(`${base}/api/portal/prerender?path=/news&path=/hvac`)
  check('path 重复传参 → 空片段', (await arrRes.text()) === '', false)
  const noneRes = await fetch(`${base}/api/portal/prerender`)
  check('不传 path → 空片段', (await noneRes.text()) === '', false)
  check('响应为裸 HTML 而非 JSON 信封', !news.startsWith('{'), news.slice(0, 40))
  const headRes = await fetch(`${base}/api/portal/prerender?path=/news`)
  check(
    'Content-Type 为 text/html',
    (headRes.headers.get('content-type') ?? '').includes('text/html'),
    headRes.headers.get('content-type'),
  )
  check('片段不被 HTTP 层缓存', headRes.headers.get('cache-control') === 'no-store', false)
}

/** 缓存：命中期内不再查库，且不同路径互不串味 */
async function runCacheChecks(frag: FragFn, ds: DataSourceLike): Promise<void> {
  say('\n【缓存】')
  const before = await frag('/news')
  await ds.query('UPDATE content SET title = ? WHERE title = ?', ['改名后的标题', '第二篇新闻'])
  const after = await frag('/news')
  check('60 秒内命中缓存（改库后片段不变）', after === before, false)
  check('缓存的是旧标题', after.includes('第二篇新闻'), false)

  // 不同路径各自独立，不会串味
  const home = await frag('/')
  check('首页片段与栏目页片段不同', home !== before, false)
  check('首页片段不含栏目页内容', !home.includes('id="company"'), false)
}
