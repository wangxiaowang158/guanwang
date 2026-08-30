// 前台官网接口层 —— 站点信息 / 首页板块 / 在线留言 / 访问记录
import { get, post } from './request'

/** 站点基本信息 */
export interface SiteInfo {
  webTitle: string
  keywords: string
  description: string
  slogan: string
  subSlogan: string
  phone: string
  website: string
  recruitEmail: string
  contactEmail: string
  address: string
  mapLng: string
  mapLat: string
  wechatQr: string
  icpCode: string
  policeCode: string
  copyright: string
  /** 网站模板：'1' 样式一（深蓝科技风）| '2' 样式二（集团品牌风） */
  template?: string
  /** 首页 Hero 背景图地址（视频优先级高于图片） */
  heroImage?: string
  /** 首页 Hero 背景视频地址 */
  heroVideo?: string
}

/** 单条文本板块（公司简介 / 经营理念） */
export interface SingleSection {
  title: string
  subtitle?: string
  content: string
}

/** 业务与行业项 */
export interface BusinessItem { id: number; icon: string; title: string; desc: string; sort: number }
/** 主要产品项 */
export interface ProductItem { id: number; name: string; summary: string; features: string[]; image: string; sort: number }
/** 技术服务项 */
export interface ServiceItem { id: number; icon: string; title: string; desc: string }
/** 合作伙伴项 */
export interface PartnerItem { id: number; name: string; logo: string; link: string; sort: number }
/** 公司业绩项 */
export interface AchievementItem { id: number; value: number; suffix: string; label: string; sort: number }
/** 社会贡献项 */
export interface SocialItem { id: number; title: string; desc: string; image: string; sort: number }

/** 首页全部板块聚合数据 */
export interface HomeSections {
  about: SingleSection
  philosophy: SingleSection
  business: BusinessItem[]
  products: ProductItem[]
  services: ServiceItem[]
  partners: PartnerItem[]
  achievements: AchievementItem[]
  social: SocialItem[]
  /** 各板块背景图配置（来自后台），key 为板块标识：hero/about/business/product/service/philosophy/partner/achievement/social/contact，无值时用默认样式 */
  backgrounds?: Record<string, string>
}

/** 获取站点基本信息 */
export const getSiteInfo = () => get<SiteInfo>('/api/site/detail')

/** 获取首页各板块聚合数据 */
export const getHomeSections = () => get<HomeSections>('/api/home/sections')

// 在线留言提交已迁至 @/api/feedback（真实后端 /api/portal/feedback/*）

/** 记录访客访问（埋点，失败由调用方静默忽略） */
export const recordVisit = (page: string) =>
  post<null>('/api/visit/record', { page })
