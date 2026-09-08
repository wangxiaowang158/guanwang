// 栏目页 SEO 配置接口层
import { get } from './request'
import type { SeoConfig } from '@/mock/seoData'

export type { SeoConfig }

/** 各栏目 SEO 配置，键为一级栏目 key */
export type SeoConfigMap = Record<string, SeoConfig>

/** 获取全部栏目的 SEO 配置（一次取全量，前台按当前路由取用） */
export const getSeoConfigs = () => get<SeoConfigMap>('/api/web/seo')
