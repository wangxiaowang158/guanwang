// 前台栏目页内容接口层
import { get } from './request'
import type { PageContent } from '@/mock/pageData'

export type { PageContent, PageHero, PageBlock, PageItem } from '@/mock/pageData'

/**
 * 获取指定栏目页内容
 * @param key 一级栏目标识（hvac/energy/smart/household/case/news/alliance/about）
 */
export const getPageContent = (key: string) =>
  get<PageContent>(`/api/page?key=${encodeURIComponent(key)}`)
