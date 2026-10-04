// 前台栏目页内容接口层 —— /api/portal/page
import { get } from './request'

/** 栏目页 Hero 区 */
export interface PageHero {
  eyebrow: string
  title: string
  desc: string
  /** 背景图地址（来自后台 Banner 配置），为空时用默认浅色样式 */
  bg?: string
}

/** 通用图文条目 */
export interface PageItem {
  id: number
  title: string
  desc?: string
  tag?: string
  image?: string
  /** 视频地址，video 板块的播放源；image 同时作为播放前首帧 */
  video?: string
  /** 富文本正文（后端已过白名单净化），rich 板块优先用它渲染 */
  html?: string
  date?: string
  sort: number
  /** 有正文可看，为真时条目做成详情页入口 */
  hasDetail?: boolean
  /** 外部链接（仅 http/https）；无正文但有链接时点击在新窗口打开 */
  link?: string
}

/** 栏目页内容块 */
export interface PageBlock {
  anchor: string
  heading: string
  subheading?: string
  /** 展示形态：cards 卡片 / list 列表 / tags 标签云 / steps 流程 / rich 富文本段落 / video 视频 */
  layout: 'cards' | 'list' | 'tags' | 'steps' | 'rich' | 'video'
  /** 板块背景图地址（来自后台配置），为空时用默认浅色/白底 */
  bg?: string
  items: PageItem[]
  /** 所属子栏目 key，续取本区块条目时回传 */
  channelKey: string
  /** 本区块已发布条目总数；大于 items.length 表示还有更多 */
  total: number
  /** 首屏每页条数，用于推算下一页页码 */
  pageSize: number
}

/** 单区块续页结果 */
export interface BlockItemsResult {
  channelKey: string
  items: PageItem[]
  total: number
  page: number
  pageSize: number
}

/** 单个栏目页完整内容 */
export interface PageContent {
  key: string
  hero: PageHero
  blocks: PageBlock[]
}

/**
 * 获取指定栏目页内容
 * @param key 一级栏目标识（hvac/energy/smart/household/case/news/alliance/about）
 */
export const getPageContent = (key: string) =>
  get<PageContent>(`/api/portal/page?key=${encodeURIComponent(key)}`)

/**
 * 取栏目页某个区块指定页的条目（页码翻页、分类筛选、一次性区块补全量）
 * @param channelKey 区块所属子栏目 key，取自 PageBlock.channelKey
 * @param page 页码，从 1 起；首屏即第 1 页
 * @param pageSize 每页条数，传首屏下发的 PageBlock.pageSize 以保证不错位
 */
export const getBlockItems = (
  channelKey: string,
  page: number,
  pageSize: number,
  category?: string,
) => {
  const query = `channelKey=${encodeURIComponent(channelKey)}&page=${page}&pageSize=${pageSize}`
  // 分类为空表示「全部」，不带该参数而非传空串：后端按有值才过滤
  const filter = category ? `&category=${encodeURIComponent(category)}` : ''
  return get<BlockItemsResult>(`/api/portal/page/block?${query}${filter}`)
}
