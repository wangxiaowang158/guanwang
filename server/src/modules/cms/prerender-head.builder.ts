// 预渲染 <head> 片段构造 —— 由网关 SSI 拼进 web 的 <head>
//
// 为什么需要它：index.html 里的 title/description 是写死的全站默认值，
// 前台靠 useSeo 在 JS 里按页改写。不执行 JS 的抓取方（百度、社交平台卡片）
// 看到的每个页面标题都一样，canonical 与 og:* 更是完全没有。
//
// 取值口径必须与 web/src/composables/useSeo.ts 一致——两边对不上时，
// 抓取方看到的标题与用户浏览器里的标题会是两个，搜索结果里也会出现与页面不符的摘要
import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { CONTENT_STATUS } from '../../common/enums'
import { Channel } from './channel.entity'
import { Content } from './content.entity'
import { esc } from './html-escape'
import { PortalCmsService } from './portal-cms.service'
import type { SiteConfig } from './site-config.entity'
import { SiteConfigService } from './site-config.service'
import { normalizeOrigin } from './site-origin'

/** 隐私政策页的固定标题，与前台该路由的 meta.title 一致 */
const PRIVACY_TITLE = '隐私政策 - 中瑞恒'

/**
 * 站点标题也没配时的最后兜底，与 index.html 的默认 <title> 一致
 * head 片段替换掉了 index.html 的默认值，这里不兜底的话页面会没有标题
 */
const DEFAULT_TITLE = '中瑞恒——让建筑更节能 让环境更舒适'

/** 一个页面的 head 取值 */
interface HeadMeta {
  title: string
  description: string
  keywords: string
  /** 规整后的站内路径，用于拼 canonical / og:url；兜底 head 不给 */
  path?: string
  /** 文章页专有：输出 og:type=article 与 og:image */
  article?: { image?: string }
  /** 禁止收录，兜底 head 用 */
  noindex?: boolean
}

@Injectable()
export class PrerenderHeadBuilder {
  constructor(
    @InjectRepository(Channel) private readonly channelRepo: Repository<Channel>,
    @InjectRepository(Content) private readonly contentRepo: Repository<Content>,
    private readonly portalCms: PortalCmsService,
    private readonly siteConfig: SiteConfigService,
  ) {}

  /**
   * 按已规整的路径构造 head
   * @param path 已过 normalizePrerenderPath 的路径
   * @returns head 片段；路径不对应任何对外页面时返回空串，由调用方改用兜底 head
   */
  async forPath(path: string): Promise<string> {
    const site = await this.siteConfig.get()
    const meta = await this.resolve(path, site)
    return meta ? this.render(meta, site) : ''
  }

  /** 站点级默认 head：非法/不存在的路径用，附 noindex，不给 canonical */
  async fallback(): Promise<string> {
    const site = await this.siteConfig.get()
    return this.render(
      { title: site.webTitle, description: site.description, keywords: site.keywords, noindex: true },
      site,
    )
  }

  /** 按路径分派取值，不存在的页面返回 null */
  private async resolve(path: string, site: SiteConfig): Promise<HeadMeta | null> {
    // 首页不特判：home 栏目的 portalPath 就是 /，走下面的栏目分支取「首页」栏目的 SEO 配置，
    // 与前台 useSeo 按路由 name=home 取 seo.home 的口径一致；栏目未配时同样回落站点级
    if (path === '/privacy') {
      return { title: PRIVACY_TITLE, description: site.description, keywords: site.keywords, path }
    }
    if (path.startsWith('/article/')) {
      return this.resolveArticle(Number(path.slice('/article/'.length)), path, site)
    }
    // 栏目页：只认配了该 portalPath 的顶级栏目，口径与 buildChannel 一致
    const top = await this.channelRepo.findOne({ where: { portalPath: path } })
    if (!top || top.parentId !== null) return null
    return {
      title: top.seoTitle || site.webTitle,
      description: top.seoDescription || site.description,
      keywords: top.seoKeywords || site.keywords,
      path,
    }
  }

  /**
   * 文章页取值：只认已发布、有正文、能上溯到对外栏目的内容
   * 放行口径与 sitemap 的文章条目一致——sitemap 里有的地址 head 就该是正常页面
   */
  private async resolveArticle(id: number, path: string, site: SiteConfig): Promise<HeadMeta | null> {
    if (!Number.isInteger(id) || id <= 0) return null
    const exists = await this.contentRepo.exists({ where: { id, status: CONTENT_STATUS.PUBLISHED } })
    if (!exists) return null

    let article: Awaited<ReturnType<PortalCmsService['articleDetail']>>
    try {
      article = await this.portalCms.articleDetail(id)
    } catch (err) {
      // 栏目不对外等情形 articleDetail 按 404 抛出，这里视作页面不存在；其余异常照常上抛
      if (err instanceof NotFoundException) return null
      throw err
    }
    if (!article.html) return null

    const parent = await this.channelRepo.findOne({ where: { key: article.parentKey } })
    return {
      title: site.webTitle ? `${article.title} - ${site.webTitle}` : article.title,
      description: article.desc || parent?.seoDescription || site.description,
      // 与描述同一回落链：内容自身 → 所属顶级栏目 → 站点。后台内容表单有「关键字」字段，不用就白填了
      keywords: article.keywords || parent?.seoKeywords || site.keywords,
      path,
      article: { image: article.image },
    }
  }

  /** 拼出 head 片段，所有来自库里的文本都过 esc() */
  private render(meta: HeadMeta, site: SiteConfig): string {
    const origin = normalizeOrigin(site.website)
    const title = meta.title || DEFAULT_TITLE
    const parts: string[] = [
      `<title>${esc(title)}</title>`,
      `<meta name="description" content="${esc(meta.description)}">`,
      `<meta name="keywords" content="${esc(meta.keywords)}">`,
    ]
    // follow 与前台 setRobots 一致：页面本身不收录，但页内链接仍应被跟踪
    if (meta.noindex) parts.push('<meta name="robots" content="noindex, follow">')
    // origin 未配置时不输出：相对地址的 canonical 各家解析不一，宁缺毋错
    const url = origin && meta.path ? `${origin}${meta.path}` : ''
    if (url) parts.push(`<link rel="canonical" href="${esc(url)}">`)
    parts.push(
      `<meta property="og:title" content="${esc(title)}">`,
      `<meta property="og:description" content="${esc(meta.description)}">`,
    )
    if (url) parts.push(`<meta property="og:url" content="${esc(url)}">`)
    // index.html 的默认 og:type 在 SSI block 里，后端 head 整体替换它，故每类页面都要自己给
    parts.push(`<meta property="og:type" content="${meta.article ? 'article' : 'website'}">`)
    if (meta.article) {
      const image = toAbsoluteImage(meta.article.image, origin)
      if (image) parts.push(`<meta property="og:image" content="${esc(image)}">`)
    }
    return parts.join('')
  }
}

/**
 * 封面补成绝对地址，og:image 要求绝对 URL
 * 已是 http(s) 地址的原样用；站内相对路径拼 origin；origin 未配置或其它形态（如 data:）不输出
 * @param image 封面地址
 * @param origin 已规整的站点 origin
 */
function toAbsoluteImage(image: string | undefined, origin: string): string {
  if (!image) return ''
  if (/^https?:\/\//i.test(image)) return image
  if (!origin || image.startsWith('//') || /^[a-z][a-z0-9+.-]*:/i.test(image)) return ''
  return `${origin}${image.startsWith('/') ? image : `/${image}`}`
}
