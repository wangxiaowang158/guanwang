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
}

/** 前台栏目页区块 */
export interface PageBlockVo {
  anchor: string
  heading: string
  subheading?: string
  layout: BlockLayout
  bg?: string
  items: PageItemVo[]
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

/** 栏目实体 → 管理端视图 */
export function toChannelVo(c: Channel): ChannelVo {
  return {
    id: c.id,
    parentId: c.parentId,
    key: c.key,
    name: c.name,
    type: c.type,
    icon: orUndefined(c.icon),
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
    createTime: formatDateTime(c.publishAt ?? c.createdAt),
    updateTime: formatDateTime(c.updatedAt),
  }
}

/**
 * 内容实体 → 前台条目视图
 * 库中按 sort 降序取出（与后台列表同序），前台按 sort 升序展示，
 * 故此处输出「取出位次」而非原始 sort 值，保证两端顺序一致
 * @param index 在同栏目结果中的下标
 */
export function toPageItemVo(c: Content, index: number): PageItemVo {
  return {
    id: c.id,
    title: c.title || c.name || '',
    desc: orUndefined(c.description),
    tag: orUndefined(c.category),
    image: orUndefined(c.cover),
    video: orUndefined(c.video),
    // 保存时已净化，这里再过一道是为了覆盖本次改动之前入库的历史数据
    html: orUndefined(sanitizeRichText(c.content)),
    date: formatDate(c.publishAt),
    sort: index + 1,
  }
}
