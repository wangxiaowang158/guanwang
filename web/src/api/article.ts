// 前台文章详情接口层 —— /api/portal/article/:id
import { get } from './request'
import type { Attachment, ContentExtra } from './page'

/** 上一篇/下一篇导航条目 */
export interface ArticleNav {
  id: number
  title: string
}

/** 相关推荐卡片 */
export interface ArticleRelated extends ArticleNav {
  image?: string
  /** 一句成效，如「综合节能率 32%」 */
  highlight?: string
}

/** 文章详情 */
export interface ArticleDetail {
  id: number
  title: string
  desc?: string
  tag?: string
  image?: string
  video?: string
  /** 富文本正文（后端已过白名单净化），渲染前前台再净化一道 */
  html?: string
  /** 结构化扩展数据（案例基础信息、指标、证言等），未录入时缺省 */
  extra?: ContentExtra
  /** 后台为该条内容录入的关键字 */
  keywords?: string
  date?: string
  author?: string
  source?: string
  /** 附件下载（产品手册、白皮书等） */
  file?: Attachment
  /** 所属栏目名 */
  channelName: string
  /** 所属顶级栏目名与其前台路径，用于面包屑与返回链接 */
  parentName: string
  parentPath: string
  /** 所属顶级栏目 key，用于上报访问埋点（按 key 归集，不受栏目路径变更影响） */
  parentKey: string
  prev: ArticleNav | null
  next: ArticleNav | null
  /** 相关推荐：同栏目里业务线/行业相近的几条；旧接口没有此字段时视为空 */
  related?: ArticleRelated[]
}

/**
 * 获取文章详情
 * @param id 内容 id
 */
export const getArticleDetail = (id: number) => get<ArticleDetail>(`/api/portal/article/${id}`)
