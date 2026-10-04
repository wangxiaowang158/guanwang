// 前台内容接口 —— /api/portal/*
// 前台只读，无需登录；字段裁剪由 formFields / listColumns 决定
import { Controller, Get, Headers, NotFoundException, Param, Query, Res } from '@nestjs/common'
import type { Response } from 'express'
import { HomeSectionService } from './home-section.service'
import { PortalCmsService } from './portal-cms.service'
import { PrerenderService } from './prerender.service'
import { SiteConfigService } from './site-config.service'
import { normalizeOrigin } from './site-origin'
import { BlockItemsQueryDto } from './dto/portal.dto'

/** 转义 XML 文本节点与 URL 中的保留字符，供 sitemap 拼接使用 */
/** 预渲染路径的长度上限，超长一律按非法路径处理 */
const PRERENDER_PATH_MAX = 512

/**
 * 取预渲染的原始请求路径：优先网关传来的 X-Prerender-Path 头，缺省时回落 ?path=
 * 查询串里的路径遇到未编码的 & 会被截断（/about&x → /about），请求头不会；
 * 查询串保留作兼容与本地直调。数组（重复传参/重复头）与超长值一律视为非法
 * @param header X-Prerender-Path 头
 * @param query ?path= 参数
 */
function pickPrerenderPath(header: unknown, query: unknown): string {
  const value = typeof header === 'string' && header ? header : query
  return typeof value === 'string' && value.length <= PRERENDER_PATH_MAX ? value : ''
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

@Controller('portal')
export class PortalCmsController {
  constructor(
    private readonly portalCms: PortalCmsService,
    private readonly homeSection: HomeSectionService,
    private readonly siteConfig: SiteConfigService,
    private readonly prerenderService: PrerenderService,
  ) {}

  /** 站点基本信息 */
  @Get('site/detail')
  async siteDetail() {
    const config = await this.siteConfig.get()
    const { id: _id, updatedAt: _updatedAt, ...rest } = config
    return rest
  }

  /** 前台导航菜单 */
  @Get('menu')
  menu() {
    return this.portalCms.menu()
  }

  /** 各页面 SEO 配置 */
  @Get('seo')
  seo() {
    return this.portalCms.seoConfigs()
  }

  /** 首页各板块内容 */
  @Get('home/sections')
  homeSections() {
    return this.homeSection.sections()
  }

  /**
   * 栏目页内容
   * @param key 顶级栏目 key
   */
  @Get('page')
  page(@Query('key') key: string) {
    return this.portalCms.pageContent(String(key || ''))
  }

  /**
   * 栏目页单区块的续页条目 —— 前台「加载更多」
   * 首屏只出前一页，这里按页续取
   */
  @Get('page/block')
  pageBlock(@Query() query: BlockItemsQueryDto) {
    return this.portalCms.blockItems(query.channelKey, query.page, query.pageSize, query.category)
  }

  /**
   * 文章详情
   * @param id 内容 id；非数字直接按 404 处理，不进数据库
   */
  @Get('article/:id')
  article(@Param('id') id: string) {
    const numeric = Number(id)
    if (!Number.isInteger(numeric) || numeric <= 0) throw new NotFoundException('内容不存在')
    return this.portalCms.articleDetail(numeric)
  }

  /**
   * 站点地图 XML
   * 用 @Res() 手写响应：直接 return 会被统一响应拦截器包成 JSON 信封，
   * 而搜索引擎要的是裸 XML。域名未配置时返回空 urlset，不输出错误页
   */
  @Get('sitemap.xml')
  async sitemap(@Res() res: Response) {
    const config = await this.siteConfig.get()
    const origin = normalizeOrigin(config.website)
    const entries = origin ? await this.portalCms.sitemapEntries() : []

    const urls = entries
      .map(e => {
        const loc = escapeXml(`${origin}${e.path === '/' ? '/' : e.path}`)
        // lastmod 取 W3C Datetime 的日期部分，精确到日已满足搜索引擎要求
        const lastmod = e.lastmod.toISOString().slice(0, 10)
        // 首页权重高于栏目页，其余一律按默认档
        const priority = e.path === '/' ? '1.0' : '0.8'
        return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <priority>${priority}</priority>\n  </url>`
      })
      .join('\n')

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`

    res.setHeader('Content-Type', 'application/xml; charset=utf-8')
    // 内容变更不频繁，给一小时缓存，避免爬虫高频回源
    res.setHeader('Cache-Control', 'public, max-age=3600')
    res.end(xml)
  }

  /**
   * 首屏预渲染片段 —— 供网关 SSI 拼进 web 的 <div id="app">
   *
   * 供网关 /__prerender 子请求调用（该 location 标了 internal）。
   * 本接口经 /api/ 仍可被外部直接访问：输出与公开接口同口径、均为已发布内容，外部可达无害。
   * 用 @Res() 手写响应：SSI 拼进 HTML 的必须是裸片段，不能是 JSON 信封。
   * 任何异常都由服务层吞成空串——片段拿不到只是回到「#app 为空」的现状，
   * 不能让它把整个页面变成错误页
   *
   * @param path 网关传入的原始请求路径（$request_uri），可能带查询串与百分号编码
   */
  @Get('prerender')
  async prerender(
    @Query('path') path: unknown,
    @Headers('x-prerender-path') headerPath: unknown,
    @Res() res: Response,
  ) {
    const raw = pickPrerenderPath(headerPath, path)
    const html = raw ? await this.prerenderService.fragment(raw) : ''

    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    // 片段随内容变动，缓存交给服务层的 60 秒进程内缓存，HTTP 层不再叠一层
    res.setHeader('Cache-Control', 'no-store')
    res.end(html)
  }

  /**
   * 预渲染 <head> 片段 —— 供网关 /__prerender_head 子请求拼进 web 的 <head>
   *
   * 与 prerender 不同，这里永远返回一段完整的 head（title/description/canonical/og:*）：
   * 非法或不存在的路径给站点级默认值并附 noindex，而不是空串——
   * 空串会让页面没有 <title>。只有服务层真的出错才抛出，交由网关按错误兜底到
   * index.html 里的默认 head（SSI stub）。
   * 用 @Res() 手写响应的原因同 prerender：SSI 要的是裸 HTML，不是 JSON 信封
   *
   * @param path 网关传入的原始请求路径（$request_uri），可能带查询串与百分号编码
   */
  @Get('prerender/head')
  async prerenderHead(
    @Query('path') path: unknown,
    @Headers('x-prerender-path') headerPath: unknown,
    @Res() res: Response,
  ) {
    // 非字符串与超长值一律按非法路径处理（仍给默认 head）
    const raw = pickPrerenderPath(headerPath, path)
    // 缓存交给服务层的进程内缓存，HTTP 层不再叠一层
    res.setHeader('Cache-Control', 'no-store')
    let html: string
    try {
      html = await this.prerenderService.head(raw)
    } catch {
      // 不能让异常冒到全局过滤器：它恒回 HTTP 200 + JSON 信封，那段 JSON 会被 SSI 原样拼进 <head>。
      // 这里直接给 500 空正文——网关拦截后以空正文收场，SSI 见正文为空改用 stub 默认 head。
      // 服务层已记录告警日志，此处不再重复
      res.status(500).end()
      return
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.end(html)
  }

  /**
   * robots.txt
   * 由后端生成而非放静态文件：Sitemap 行需要绝对 URL，
   * 而域名存在库里，构建期取不到
   */
  @Get('robots.txt')
  async robots(@Res() res: Response) {
    const config = await this.siteConfig.get()
    const origin = normalizeOrigin(config.website)

    const lines = ['User-agent: *', 'Allow: /', 'Disallow: /member/']
    // 域名未配置时不输出 Sitemap 行，避免给出无效地址
    if (origin) lines.push(`Sitemap: ${origin}/sitemap.xml`)

    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.setHeader('Cache-Control', 'public, max-age=3600')
    res.end(`${lines.join('\n')}\n`)
  }
}
