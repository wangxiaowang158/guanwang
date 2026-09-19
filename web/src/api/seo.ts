// 栏目页 SEO 配置接口层 —— /api/portal/seo
// 后台按栏目录入 TDK，前台据此输出页面标题与搜索引擎信息
import { get } from './request'

/** 单个栏目的 SEO 配置 */
export interface SeoConfig {
  /** 页面标题，写入 document.title */
  title: string
  /** 关键词，写入 meta[name=keywords] */
  keywords: string
  /** 页面描述，写入 meta[name=description] */
  description: string
}

/** 各栏目 SEO 配置，键为一级栏目 key */
export type SeoConfigMap = Record<string, SeoConfig>

/** 获取全部栏目的 SEO 配置（一次取全量，前台按当前路由取用） */
export const getSeoConfigs = () => get<SeoConfigMap>('/api/portal/seo')
