// 站内搜索接口层 —— /api/portal/search
import { get } from './request'

/** 单条结果，与后端 SearchHitVo 一致 */
export interface SearchHit {
  id: number
  title: string
  /** 命中处附近的一段纯文本 */
  snippet: string
  /** 所属页面名 */
  pageName: string
  /** 站内地址：/article/:id 或 栏目页#锚点 */
  path: string
  cover?: string
  date?: string
}

export interface SearchResult {
  keyword: string
  list: SearchHit[]
  total: number
  page: number
  pageSize: number
}

/** 关键词长度上限，与后端 SEARCH_KEYWORD_MAX 一致 */
export const SEARCH_KEYWORD_MAX = 50

/**
 * 搜索
 * @param q 关键词
 * @param page 页码，从 1 起
 */
export const searchSite = (q: string, page = 1) =>
  get<SearchResult>(`/api/portal/search?q=${encodeURIComponent(q)}&page=${page}&pageSize=10`)
