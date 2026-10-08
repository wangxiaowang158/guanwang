// 首屏预渲染片段 —— 把页面主要内容渲染成一段静态 HTML，由网关 SSI 塞进 <div id="app">
//
// 为什么需要它：web 是纯客户端渲染的 SPA，首屏 HTML 里 #app 是空的。
// Googlebot 会执行 JS 拿得到内容，但百度、社交平台抓取、各类无头爬虫多数不执行，
// 它们看到的就是一个空壳——标题描述有（index.html 里写死的），正文一个字没有。
//
// 为什么不做构建期预渲染：内容全在 CMS 里，运营改一条新闻就得重新构建整个前端，不成立。
// 为什么不做 SSR：要把整套 Vue 组件搬到 Node 侧跑，改动面与部署形态都大一个量级，
// 而这里要解决的只是「抓取方看不到正文」，一段语义 HTML 就够。
//
// 片段被 Vue 的 mount() 覆盖（runtime-dom 挂载前会清空容器），故对真实用户
// 只是极短一瞬的纯文本闪现，不影响交互；对抓取方则是实打实的正文。
import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, IsNull, Repository } from 'typeorm'
import sanitizeHtml from 'sanitize-html'
import { BLOCK_LAYOUT, CONTENT_STATUS } from '../../common/enums'
import { Channel } from './channel.entity'
import { Content } from './content.entity'
import { ContentService } from './content.service'
import { PortalCmsService } from './portal-cms.service'
import { SiteConfigService } from './site-config.service'
import { HOME_SECTION_KEYS } from './home-section.service'
import { PrerenderHeadBuilder } from './prerender-head.builder'
import { esc } from './html-escape'

/** 片段缓存有效期。内容改动最迟一分钟后生效，换来抓取高峰时不逐次穿到库 */
const CACHE_TTL_MS = 60_000

/** 缓存条目上限。路径集合本就有限（首页 + 9 个栏目页 + 文章），留足冗余即可 */
const CACHE_MAX_ENTRIES = 128

/** 摘要类文本的截断长度，避免把整篇正文塞进列表项 */
const SUMMARY_MAX = 200

/** 每个区块最多输出几条。抓取方要的是「有内容且能发现下一跳」，不是全量列表 */
const BLOCK_MAX_ITEMS = 8

/**
 * 允许预渲染的路径形态
 * 先按形状挡一道再查库：随机 URL 打过来时连一次栏目查询都不用发。
 * 只放行小写字母数字连字符的单层路径与 /article/数字，会员中心（多层、要登录态）不在其列。
 * /privacy 形态上被放行：正文片段因无对应栏目自然为空（静态文案不预渲染），
 * head 片段则按固定口径输出隐私政策的标题描述
 */
const PATH_PATTERN = /^\/(?:[a-z0-9-]{1,32}|article\/\d{1,12})?$/

/** head 片段的缓存键前缀，与正文片段共用一张表而互不冲突 */
const HEAD_CACHE_PREFIX = 'head:'

/**
 * 兜底 head 的缓存键
 * 用 # 是因为规整后的路径里不可能出现它（哈希已被剥掉，形态校验也不放行），不会与真实路径撞键
 */
const HEAD_FALLBACK_CACHE_KEY = `${HEAD_CACHE_PREFIX}#fallback`

/** 正文就地渲染的板块形态，与 portal-cms.service 的口径一致 */
const INLINE_HTML_LAYOUTS = new Set<string>([BLOCK_LAYOUT.RICH, BLOCK_LAYOUT.VIDEO])

/**
 * 站内链接判定：只认单个 / 开头的相对路径
 * esc() 挡不住 javascript: 这类协议，而栏目路径是后台录入的数据；
 * // 开头是协议相对地址，会跳到外站，也一并拒绝
 */
function isSitePath(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//')
}

/**
 * 富文本降级为纯文本
 * 首页简介这类字段存的是富文本，但片段里只需要一句摘要，
 * 剥掉标签既省体积又免去一层注入面
 * @param html 原始内容，空值按空串处理
 * @param max 截断长度
 */
function toPlainText(html: string | null | undefined, max = SUMMARY_MAX): string {
  if (!html) return ''
  const text = sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} })
    .replace(/\s+/g, ' ')
    .trim()
  return text.length > max ? `${text.slice(0, max)}…` : text
}

/**
 * 规整路径：剥查询串与哈希、解码、去尾斜杠，并按白名单形态校验
 * 片段与 head 共用同一道形态校验，两边对「什么算合法页面路径」必须一个口径
 * @param rawPath 网关传来的原始请求路径
 * @returns 规整后的路径，不该预渲染时返回 null
 */
export function normalizePrerenderPath(rawPath: string): string | null {
  const cut = rawPath.split(/[?#]/)[0] ?? ''
  let decoded: string
  try {
    decoded = decodeURIComponent(cut)
  } catch {
    // 非法百分号编码，不是任何真实页面
    return null
  }
  // NUL 会让底层字符串处理在中途截断，绕过下面的形态校验
  if (decoded.includes('\0')) return null
  // 网关回退到 /index.html 时 $request_uri 仍是原始路径，但直接访问 /index.html 也要认
  if (decoded === '/index.html') return '/'
  // 去掉尾斜杠，使 /news 与 /news/ 命中同一份缓存
  const trimmed = decoded.length > 1 ? decoded.replace(/\/+$/, '') : decoded
  const path = trimmed || '/'
  return PATH_PATTERN.test(path) ? path : null
}

/** 缓存条目 */
interface CacheEntry {
  html: string
  expireAt: number
}

@Injectable()
export class PrerenderService {
  private readonly logger = new Logger(PrerenderService.name)

  /** 路径 → 片段。进程内缓存即可：片段是纯读派生物，多实例各存一份不会互相矛盾 */
  private readonly cache = new Map<string, CacheEntry>()

  constructor(
    @InjectRepository(Channel) private readonly channelRepo: Repository<Channel>,
    @InjectRepository(Content) private readonly contentRepo: Repository<Content>,
    private readonly contentService: ContentService,
    private readonly portalCms: PortalCmsService,
    private readonly siteConfig: SiteConfigService,
    private readonly headBuilder: PrerenderHeadBuilder,
  ) {}

  /**
   * 取某个前台路径的首屏片段
   * 任何异常都返回空串而非抛出：片段是锦上添花，拿不到只是回到现状（空 #app），
   * 不能让它把整个页面拖成错误页
   * @param rawPath 网关传来的原始请求路径，可能带查询串与百分号编码
   */
  async fragment(rawPath: string): Promise<string> {
    const path = normalizePrerenderPath(rawPath)
    if (path === null) return ''

    // 命中后挪到队尾，淘汰顺序由 FIFO 变为 LRU，热点页不会被批量新路径挤出
    const hit = this.getCache(path)
    if (hit !== undefined) return hit

    let html = ''
    try {
      html = await this.build(path)
    } catch (err) {
      this.logger.warn(`预渲染 ${path} 失败：${err instanceof Error ? err.message : String(err)}`)
      return ''
    }
    // 空片段不进缓存：形态合法但不存在的路径可无限枚举，
    // 若也占条目，刷一轮就能把首页等热点片段全部挤掉
    if (html) this.putCache(path, html)
    return html
  }

  /**
   * 取某个前台路径的预渲染 <head> 片段
   * 与 fragment() 相反，这里永远给出完整 head：非法/不存在的路径输出站点级默认值 + noindex，
   * 否则页面会连 <title> 都没有。只有真出错才抛出，由网关兜底到 index.html 的默认 head
   * @param rawPath 网关传来的原始请求路径，可能带查询串与百分号编码
   */
  async head(rawPath: string): Promise<string> {
    const path = normalizePrerenderPath(rawPath)
    // 与 fragment 共用一张缓存表，靠前缀区分；兜底 head 与路径无关，全体非法路径共用一个键，
    // 这样随机 URL 再多也只占一个条目，又不必每次查库
    const key = path === null ? HEAD_FALLBACK_CACHE_KEY : `${HEAD_CACHE_PREFIX}${path}`
    const hit = this.getCache(key)
    if (hit !== undefined) return hit

    try {
      if (path !== null) {
        const html = await this.headBuilder.forPath(path)
        if (html) {
          this.putCache(key, html)
          return html
        }
        // 形态合法但不存在（栏目已删、文章未发布）：改走兜底 head，且不按该路径缓存，
        // 理由同 fragment 的空片段不入缓存——可无限枚举的路径不该各占一个条目
        const cached = this.getCache(HEAD_FALLBACK_CACHE_KEY)
        if (cached !== undefined) return cached
      }
      const fallback = await this.headBuilder.fallback()
      this.putCache(HEAD_FALLBACK_CACHE_KEY, fallback)
      return fallback
    } catch (err) {
      this.logger.warn(`预渲染 head ${rawPath.slice(0, 128)} 失败：${err instanceof Error ? err.message : String(err)}`)
      // 向上抛出：让网关拿到非 2xx 并以空正文收场，SSI 才会改用 index.html 里的默认 head
      throw err
    }
  }

  /** 读缓存，命中且未过期时挪到队尾（LRU），否则返回 undefined */
  private getCache(key: string): string | undefined {
    const hit = this.cache.get(key)
    if (!hit || hit.expireAt <= Date.now()) return undefined
    this.cache.delete(key)
    this.cache.set(key, hit)
    return hit.html
  }

  /** 写缓存，超过条数上限时丢掉最早插入的一条（Map 保持插入序） */
  private putCache(key: string, html: string): void {
    if (this.cache.size >= CACHE_MAX_ENTRIES) {
      const oldest = this.cache.keys().next()
      if (!oldest.done) this.cache.delete(oldest.value)
    }
    this.cache.set(key, { html, expireAt: Date.now() + CACHE_TTL_MS })
  }

  /** 按路径分派到对应的片段构造 */
  private async build(path: string): Promise<string> {
    if (path === '/') return this.buildHome()
    if (path.startsWith('/article/')) {
      return this.buildArticle(Number(path.slice('/article/'.length)))
    }
    return this.buildChannel(path)
  }

  /**
   * 站内导航
   * 片段里必须有它：抓取方靠链接发现其余页面，
   * 只给当前页正文的话除首页外的地址全靠 sitemap 单线暴露
   */
  private async buildNav(): Promise<string> {
    const tops = await this.channelRepo.find({
      where: { parentId: IsNull() },
      order: { sort: 'ASC', id: 'ASC' },
    })
    const links = tops
      .filter(c => !c.hidden && isSitePath(c.portalPath))
      .map(c => `<li><a href="${esc(c.portalPath as string)}">${esc(c.name)}</a></li>`)
    if (!links.length) return ''
    return `<nav aria-label="主导航"><ul>${links.join('')}</ul></nav>`
  }

  /** 首页片段：站点定位 + 公司简介 + 业务领域 + 主要产品 */
  private async buildHome(): Promise<string> {
    const [site, nav, contents, headingChannels] = await Promise.all([
      this.siteConfig.get(),
      this.buildNav(),
      this.contentService.listByChannelKeys(
        [HOME_SECTION_KEYS.ABOUT, HOME_SECTION_KEYS.BUSINESS, HOME_SECTION_KEYS.PRODUCT],
        BLOCK_MAX_ITEMS,
      ),
      this.channelRepo.find({ where: { key: In([HOME_SECTION_KEYS.BUSINESS, HOME_SECTION_KEYS.PRODUCT]) } }),
    ])
    // 板块标题与前台同源：主标题 → 栏目名（小标题）→ 内置文案；后台改了标题，爬虫看到的也跟着变
    const headingOf = (key: string, fallback: string) => {
      const ch = headingChannels.find(c => c.key === key)
      return ch?.subheading?.trim() || ch?.name?.trim() || fallback
    }

    const pick = (key: string) => contents.filter(c => c.channelKey === key)
    const parts: string[] = []

    const title = site.webTitle || site.slogan
    if (title) parts.push(`<h1>${esc(title)}</h1>`)
    if (site.subSlogan) parts.push(`<p>${esc(site.subSlogan)}</p>`)
    if (site.description) parts.push(`<p>${esc(site.description)}</p>`)

    const about = pick(HOME_SECTION_KEYS.ABOUT)[0]
    if (about) {
      const body = toPlainText(about.content ?? about.description, 500)
      if (body) {
        parts.push(`<section><h2>${esc(about.title ?? '公司简介')}</h2><p>${esc(body)}</p></section>`)
      }
    }

    parts.push(this.itemsSection(headingOf(HOME_SECTION_KEYS.BUSINESS, '业务领域'), pick(HOME_SECTION_KEYS.BUSINESS)))
    parts.push(this.itemsSection(headingOf(HOME_SECTION_KEYS.PRODUCT, '主要产品'), pick(HOME_SECTION_KEYS.PRODUCT)))

    const contact: string[] = []
    if (site.phone) contact.push(`<p>联系电话：${esc(site.phone)}</p>`)
    if (site.address) contact.push(`<p>办公地址：${esc(site.address)}</p>`)
    const contactTitle = site.contactHeading?.trim() || '联系我们'
    if (contact.length) parts.push(`<section><h2>${esc(contactTitle)}</h2>${contact.join('')}</section>`)

    return this.wrap(nav + parts.filter(Boolean).join(''))
  }

  /**
   * 「标题 + 摘要」列表小节，首页多个板块共用
   * @param heading 小节标题
   * @param items 内容条目
   */
  private itemsSection(heading: string, items: Content[]): string {
    const lis = items
      .map(c => {
        const name = c.title || c.name || ''
        if (!name) return ''
        const desc = toPlainText(c.description ?? c.intro, 120)
        return `<li><h3>${esc(name)}</h3>${desc ? `<p>${esc(desc)}</p>` : ''}</li>`
      })
      .filter(Boolean)
    if (!lis.length) return ''
    return `<section><h2>${esc(heading)}</h2><ul>${lis.join('')}</ul></section>`
  }

  /**
   * 栏目页片段：Hero 文案 + 各区块条目
   * 复用 portalCms.pageContent()，口径与前台接口完全一致，
   * 不另写一套取数逻辑——两套逻辑迟早会对不上，而抓取方看到的与用户看到的必须是同一份内容
   * @param path 前台路径，如 /hvac
   */
  private async buildChannel(path: string): Promise<string> {
    const top = await this.channelRepo.findOne({ where: { portalPath: path } })
    if (!top || top.parentId !== null || top.hidden) return ''

    const [nav, page] = await Promise.all([
      this.buildNav(),
      this.portalCms.pageContent(top.key),
    ])

    const parts: string[] = []
    parts.push(`<h1>${esc(page.hero.title || top.name)}</h1>`)
    if (page.hero.eyebrow) parts.push(`<p>${esc(page.hero.eyebrow)}</p>`)
    if (page.hero.desc) parts.push(`<p>${esc(page.hero.desc)}</p>`)

    for (const block of page.blocks) {
      const inner: string[] = [`<h2>${esc(block.heading)}</h2>`]
      if (block.subheading) inner.push(`<p>${esc(block.subheading)}</p>`)

      if (INLINE_HTML_LAYOUTS.has(block.layout)) {
        // 正文就地渲染的板块，正文本身就是这一段的内容。
        // html 已由 VO 层过 sanitizeRichText 白名单，可直出
        const bodies = block.items.map(it => it.html ?? '').filter(Boolean)
        inner.push(bodies.join(''))
      } else {
        const lis = block.items
          .slice(0, BLOCK_MAX_ITEMS)
          .map(it => {
            const title = it.hasDetail
              ? `<a href="/article/${it.id}">${esc(it.title)}</a>`
              : esc(it.title)
            const desc = it.desc ? `<p>${esc(toPlainText(it.desc, 120))}</p>` : ''
            const date = it.date ? `<time datetime="${esc(it.date)}">${esc(it.date)}</time>` : ''
            return `<li><h3>${title}</h3>${date}${desc}</li>`
          })
        if (lis.length) inner.push(`<ul>${lis.join('')}</ul>`)
      }
      parts.push(`<section id="${esc(block.anchor)}">${inner.join('')}</section>`)
    }

    return this.wrap(nav + parts.join(''))
  }

  /**
   * 文章详情片段：面包屑 + 标题 + 元信息 + 正文 + 上下篇
   * 这是预渲染收益最大的一类页面——正文是页面的全部价值，而 SPA 下它完全取决于 JS
   * @param id 内容 id
   */
  private async buildArticle(id: number): Promise<string> {
    if (!Number.isInteger(id) || id <= 0) return ''
    // 未发布与不存在一律按无片段处理，口径与 articleDetail 一致
    const exists = await this.contentRepo.exists({
      where: { id, status: CONTENT_STATUS.PUBLISHED },
    })
    if (!exists) return ''

    const article = await this.portalCms.articleDetail(id)
    const parts: string[] = []

    parts.push(
      `<nav aria-label="面包屑"><a href="/">首页</a> / ` +
        (isSitePath(article.parentPath)
          ? `<a href="${esc(article.parentPath)}">${esc(article.parentName)}</a> / `
          : `<span>${esc(article.parentName)}</span> / `) +
        `<span>${esc(article.channelName)}</span></nav>`,
    )
    parts.push(`<article><h1>${esc(article.title)}</h1>`)

    const meta: string[] = []
    if (article.date) meta.push(`<time datetime="${esc(article.date)}">${esc(article.date)}</time>`)
    if (article.author) meta.push(`<span>作者：${esc(article.author)}</span>`)
    if (article.source) meta.push(`<span>来源：${esc(article.source)}</span>`)
    if (meta.length) parts.push(`<p>${meta.join(' ')}</p>`)

    if (article.desc) parts.push(`<p>${esc(article.desc)}</p>`)
    // html 已由 VO 层过白名单，直出以保留标题层级、段落与图片 alt 等语义信息
    if (article.html) parts.push(article.html)
    parts.push('</article>')

    const around: string[] = []
    if (article.prev) {
      around.push(`<li>上一篇：<a href="/article/${article.prev.id}">${esc(article.prev.title)}</a></li>`)
    }
    if (article.next) {
      around.push(`<li>下一篇：<a href="/article/${article.next.id}">${esc(article.next.title)}</a></li>`)
    }
    if (around.length) parts.push(`<nav aria-label="相邻文章"><ul>${around.join('')}</ul></nav>`)

    return this.wrap(parts.join(''))
  }

  /**
   * 包一层容器
   * 类名给前台样式留出钩子：片段在 JS 接管前会真实显示一瞬，
   * 不给最基本的排版会是一片贴边的裸文本
   * @param inner 片段主体，空则整体返回空串
   */
  private wrap(inner: string): string {
    if (!inner.trim()) return ''
    return `<div class="prerender-shell">${inner}</div>`
  }
}
