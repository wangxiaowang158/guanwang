// 前台文章详情接口层 —— /api/portal/article/:id
import { get } from './request'

/** 上一篇/下一篇导航条目 */
export interface ArticleNav {
  id: number
  title: string
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
  /** 后台为该条内容录入的关键字 */
  keywords?: string
  date?: string
  author?: string
  source?: string
  /** 所属栏目名 */
  channelName: string
  /** 所属顶级栏目名与其前台路径，用于面包屑与返回链接 */
  parentName: string
  parentPath: string
  /** 所属顶级栏目 key，用于上报访问埋点（按 key 归集，不受栏目路径变更影响） */
  parentKey: string
  prev: ArticleNav | null
  next: ArticleNav | null
}

/**
 * 获取文章详情
 * @param id 内容 id
 */
export const getArticleDetail = (id: number) => get<ArticleDetail>(`/api/portal/article/${id}`)
