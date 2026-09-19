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
