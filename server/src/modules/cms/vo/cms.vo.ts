// CMS 出参结构 —— 管理端与前台各一套，字段名与前端既有接口层保持一致，避免前端改动
import { sanitizeRichText } from '../../../common/html-sanitizer'
import type { BlockLayout } from '../../../common/enums'
import type { Channel } from '../channel.entity'
import type { Content } from '../content.entity'

/** 管理端栏目视图，formFields / listColumns 还原为数组 */
export interface ChannelVo {
  id: number
  parentId: number | null
  key: string
  name: string
  type: string
  icon?: string
  /** 是否隐藏 */
  hidden: boolean
  sort: number
  formFields: string[]
  listColumns: string[]
  seoTitle?: string
  seoKeywords?: string
  seoDescription?: string
  portalPath?: string
  anchor?: string
  subheading?: string
  layout?: string
  heroEyebrow?: string
  heroTitle?: string
  heroDesc?: string
  updateTime?: string
}

/** 前台导航菜单节点 */
export interface MenuNodeVo {
  key: string
  label: string
  path: string
  anchor?: string
  children?: MenuNodeVo[]
}

/** 栏目页 SEO 配置 */
export interface SeoConfigVo {
  title: string
  keywords: string
  description: string
}

/** 前台栏目页条目 */
export interface PageItemVo {
  id: number
  title: string
  desc?: string
  tag?: string
  image?: string
  /** 视频地址，video 板块的播放源 */
  video?: string
  /** 已净化的富文本正文，rich 板块渲染用 */
  html?: string
  date?: string
  sort: number
  /** 有正文可看，前台据此把条目做成详情页入口 */
  hasDetail?: boolean
  /**
   * 外链地址，仅 http(s) 绝对地址。前台约定：有 hasDetail 进详情；
   * 否则有 link 新窗口打开；都没有则条目不可点
   */
  link?: string
}

/** 前台文章详情，新闻/案例等有正文的条目点进来看 */
export interface ArticleDetailVo {
  id: number
  title: string
  desc?: string
  tag?: string
  image?: string
  video?: string
  /** 已净化的富文本正文 */
  html?: string
  /** 后台为该条内容录入的关键字，详情页 SEO 用；未录入时由调用方回落栏目/站点关键字 */
  keywords?: string
  date?: string
  author?: string
  source?: string
  /** 所属栏目名与其顶级栏目路径，前台用于面包屑与返回链接 */
  channelName: string
  parentName: string
  parentPath: string
  /**
   * 顶级栏目 key，前台用它上报访问埋点
   * 给 key 而不让前台从 parentPath 反推：埋点按 key 归集，
   * 后台改栏目路径时历史统计不该被割成两段
   */
  parentKey: string
  /** 同栏目上一篇/下一篇，无则为 null */
  prev: ArticleNavVo | null
  next: ArticleNavVo | null
}

/** 上一篇/下一篇导航条目 */
export interface ArticleNavVo {
  id: number
  title: string
}

/** 前台栏目页区块 */
export interface PageBlockVo {
  anchor: string
  heading: string
  subheading?: string
  layout: BlockLayout
  bg?: string
  items: PageItemVo[]
  /** 所属子栏目 key，前台续取本区块条目时回传 */
  channelKey: string
  /** 本区块已发布条目总数；大于 items.length 表示还有更多 */
  total: number
  /** 首屏每页条数，前台按此推算下一页页码 */
  pageSize: number
}

/** 栏目页单区块的续页条目 */
export interface BlockItemsVo {
  channelKey: string
  items: PageItemVo[]
  total: number
  page: number
  pageSize: number
}

/** 前台栏目页完整内容 */
export interface PageContentVo {
  key: string
  hero: { eyebrow: string; title: string; desc: string; bg?: string }
  blocks: PageBlockVo[]
}

/** 把 JSON 字符串安全还原为字符串数组，解析失败按空数组处理 */
export function parseStringArray(raw: string | null): string[] {
  if (!raw) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : []
  } catch {
    return []
  }
}

/** 格式化为 `YYYY-MM-DD HH:mm:ss`，前端列表直接展示 */
export function formatDateTime(d: Date | null | undefined): string | undefined {
  if (!d) return undefined
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

/** 格式化为 `YYYY-MM-DD` */
export function formatDate(d: Date | null | undefined): string | undefined {
  if (!d) return undefined
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/** 空字符串按「未设置」处理，避免前端把 '' 当有效值渲染 */
function orUndefined(v: string | null | undefined): string | undefined {
  return v ? v : undefined
}

/**
 * 只放行 http(s) 绝对地址，其余一律视为未设置
 * link 由后台自由录入，前台会拿它做 <a href>：javascript:/data: 等协议是 XSS 入口，
 * 相对路径在新窗口打开时语义含糊（指向前台自身），都不对外输出
 */
export function safeLink(raw: string | null | undefined): string | undefined {
  const v = raw?.trim()
  if (!v) return undefined
  try {
    const url = new URL(v)
    return url.protocol === 'http:' || url.protocol === 'https:' ? v : undefined
  } catch {
    // 无法按绝对地址解析（相对路径、残缺地址）
    return undefined
  }
}

/** 栏目实体 → 管理端视图 */
export function toChannelVo(c: Channel): ChannelVo {
  return {
    id: c.id,
    parentId: c.parentId,
    key: c.key,
    name: c.name,
    type: c.type,
    icon: orUndefined(c.icon),
    hidden: !!c.hidden,
    sort: c.sort,
    formFields: parseStringArray(c.formFields),
    listColumns: parseStringArray(c.listColumns),
    seoTitle: orUndefined(c.seoTitle),
    seoKeywords: orUndefined(c.seoKeywords),
    seoDescription: orUndefined(c.seoDescription),
    portalPath: orUndefined(c.portalPath),
    anchor: orUndefined(c.anchor),
    subheading: orUndefined(c.subheading),
    layout: orUndefined(c.layout),
    heroEyebrow: orUndefined(c.heroEyebrow),
    heroTitle: orUndefined(c.heroTitle),
    heroDesc: orUndefined(c.heroDesc),
    updateTime: formatDateTime(c.updatedAt),
  }
}

/** 内容实体 → 管理端视图，字段名沿用前端 Content 接口 */
export function toContentVo(c: Content): Record<string, unknown> {
  return {
    id: c.id,
    channelKey: c.channelKey,
    title: orUndefined(c.title),
    name: orUndefined(c.name),
    subtitle: orUndefined(c.subtitle),
    keywords: orUndefined(c.keywords),
    description: orUndefined(c.description),
    intro: orUndefined(c.intro),
    content: orUndefined(c.content),
    cover: orUndefined(c.cover),
    video: orUndefined(c.video),
    whiteCover: orUndefined(c.whiteCover),
    file: orUndefined(c.file),
    link: orUndefined(c.link),
    category: orUndefined(c.category),
    icon: orUndefined(c.icon),
    brand: orUndefined(c.brand),
    author: orUndefined(c.author),
    source: orUndefined(c.source),
    sort: c.sort,
    isTop: c.isTop,
    status: c.status,
    createTime: formatDateTime(c.publishAt ?? c.createdAt),
    // 单独给出运营设定的发布时间（未设定为 undefined），编辑表单回填用；
    // createTime 已按「发布时间优先」合并，无法分辨哪些是手工设定的
    publishAt: formatDateTime(c.publishAt),
    updateTime: formatDateTime(c.updatedAt),
  }
}

/**
 * 内容实体 → 前台条目视图
 * 库中按 sort 降序取出（与后台列表同序），前台按 sort 升序展示，
 * 故此处输出「取出位次」而非原始 sort 值，保证两端顺序一致
 * @param index 在同栏目结果中的下标
 * @param includeHtml 是否带上正文。只有 rich / video 板块就地渲染正文需要它；
 *   其余板块（卡片、列表）只展示标题摘要，带上正文等于把整栏目全文塞进列表响应，
 *   一个栏目十几条长文就是几百 KB。不带正文的条目改为给 hasDetail 标记，前台点进详情页再取
 */
export function toPageItemVo(c: Content, index: number, includeHtml = true): PageItemVo {
  // 保存时已净化，这里再过一道是为了覆盖本次改动之前入库的历史数据
  const html = orUndefined(sanitizeRichText(c.content))
  const vo: PageItemVo = {
    id: c.id,
    title: c.title || c.name || '',
    desc: orUndefined(c.description),
    tag: orUndefined(c.category),
    image: orUndefined(c.cover),
    video: orUndefined(c.video),
    // 列表只展示运营明确指定的发布时间：回落创建日期的话，产品、服务这类非资讯条目
    // 也会平白多出一个日期。详情页的发布信息才按 SRS 3.5.1 回落创建日期
    date: formatDate(c.publishAt),
    sort: index + 1,
    link: safeLink(c.link),
  }
  if (includeHtml) {
    vo.html = html
    return vo
  }
  // 正文就地渲染的板块无需再点进去看，故 hasDetail 只在不带正文时才有意义
  if (html) vo.hasDetail = true
  return vo
}

/**
 * 内容实体 → 前台文章详情视图
 * @param c 内容实体
 * @param ctx 栏目上下文与相邻文章，由服务层查好传入
 */
export function toArticleDetailVo(
  c: Content,
  ctx: {
    channelName: string
    parentName: string
    parentPath: string
    parentKey: string
    prev: ArticleNavVo | null
    next: ArticleNavVo | null
  },
): ArticleDetailVo {
  return {
    id: c.id,
    title: c.title || c.name || '',
    desc: orUndefined(c.description),
    tag: orUndefined(c.category),
    image: orUndefined(c.cover),
    video: orUndefined(c.video),
    html: orUndefined(sanitizeRichText(c.content)),
    keywords: orUndefined(c.keywords),
    // 未指定发布时间时取创建日期（SRS 3.5.1 内容详情·发布信息）
    date: formatDate(c.publishAt ?? c.createdAt),
    author: orUndefined(c.author),
    source: orUndefined(c.source),
    channelName: ctx.channelName,
    parentName: ctx.parentName,
    parentPath: ctx.parentPath,
    parentKey: ctx.parentKey,
    prev: ctx.prev,
    next: ctx.next,
  }
}
