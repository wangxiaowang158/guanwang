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

/** 业务线取值，对应三大业务主线（与后端 content-extra.ts 一致） */
export type BusinessLine = 'energy' | 'building' | 'living'

/** 指标：量化价值看板、案例收益共用 */
export interface ExtraMetric {
  label: string
  value: string
  unit?: string
  note?: string
}

/** 痛点 → 解决方案 → 量化价值 */
export interface ExtraPain {
  title: string
  desc?: string
  solution?: string
  value?: string
}

/** 名称 + 说明的条目：流程步骤、合作模式 */
export interface ExtraItem {
  title: string
  desc?: string
}

/** 键值对：案例基础信息 */
export interface ExtraFact {
  label: string
  value: string
}

/** 客户证言 */
export interface ExtraQuote {
  text: string
  author?: string
  org?: string
}

/** 内容扩展数据：结构化信息的统一载体，各字段均可缺省 */
export interface ContentExtra {
  business?: BusinessLine
  industries?: string[]
  tags?: string[]
  metrics?: ExtraMetric[]
  pains?: ExtraPain[]
  steps?: ExtraItem[]
  modes?: ExtraItem[]
  facts?: ExtraFact[]
  gallery?: string[]
  quote?: ExtraQuote
}

/** 多维筛选条件：维度之间 AND，同一维度内多个取值 OR */
export interface ExtraFilterParams {
  business?: string[]
  industry?: string[]
  tag?: string[]
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
  /** 结构化扩展数据（指标、痛点、流程、证言等），未录入时缺省 */
  extra?: ContentExtra
}

/** 栏目页内容块 */
export interface PageBlock {
  anchor: string
  heading: string
  subheading?: string
  /**
   * 展示形态：cards 卡片 / list 列表 / tags 标签云 / steps 流程 / rich 富文本段落 / video 视频；
   * 结构化形态数据取自条目 extra：pains 痛点方案 / flow 全链条流程 / metrics 指标看板 /
   * modes 合作模式 / quote 客户证言 / gallery 图集
   */
  layout: 'cards' | 'list' | 'tags' | 'steps' | 'rich' | 'video'
    | 'pains' | 'flow' | 'metrics' | 'modes' | 'quote' | 'gallery'
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
 * @param key 一级栏目标识（home/business/business-energy/business-building/business-living/products/solutions/case/news/alliance/about）
 */
export const getPageContent = (key: string) =>
  get<PageContent>(`/api/portal/page?key=${encodeURIComponent(key)}`)

/**
 * 取栏目页某个区块指定页的条目（页码翻页、分类筛选、一次性区块补全量）
 * @param channelKey 区块所属子栏目 key，取自 PageBlock.channelKey
 * @param page 页码，从 1 起；首屏即第 1 页
 * @param pageSize 每页条数，传首屏下发的 PageBlock.pageSize 以保证不错位
 * @param category 分类名，为空表示全部
 * @param extra 业务线/行业/标签多维筛选，各维度为空数组或缺省时不带该参数
 */
export const getBlockItems = (
  channelKey: string,
  page: number,
  pageSize: number,
  category?: string,
  extra?: ExtraFilterParams,
) => {
  const query = `channelKey=${encodeURIComponent(channelKey)}&page=${page}&pageSize=${pageSize}`
  // 分类为空表示「全部」，不带该参数而非传空串：后端按有值才过滤
  let filter = category ? `&category=${encodeURIComponent(category)}` : ''
  // 多值以逗号拼接后整体编码一次（后端按逗号切分，取值本身不能含逗号，含逗号的取值直接丢弃）
  for (const dim of ['business', 'industry', 'tag'] as const) {
    const joined = (extra?.[dim] ?? []).filter(v => v && !v.includes(',')).join(',')
    if (joined) filter += `&${dim}=${encodeURIComponent(joined)}`
  }
  return get<BlockItemsResult>(`/api/portal/page/block?${query}${filter}`)
}
