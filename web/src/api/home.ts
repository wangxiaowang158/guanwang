// 前台官网接口层 —— /api/portal/*：站点信息 / 首页板块 / 访问记录
import { get, post } from './request'
import type { ExtraQuote } from './page'

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
  /** 地图跳转链接，为空时地址不可点击 */
  mapLink: string
  wechatQr: string
  /** 页头 Logo 地址，为空时回退到文字品牌标识 */
  logo: string
  /** 页脚 Logo 地址，为空时回退到文字品牌标识 */
  footerLogo: string
  icpCode: string
  policeCode: string
  copyright: string
  /** 网站模板：'1' 样式一（深蓝科技风）| '2' 样式二（集团品牌风） */
  template?: string
  /** 首页 Hero 背景图地址（视频优先级高于图片） */
  heroImage?: string
  /** 首页 Hero 背景视频地址 */
  heroVideo?: string
  /** 首屏主按钮文字，为空时用内置文案 */
  heroPrimaryText?: string
  /** 首屏次按钮文字，为空时用内置文案 */
  heroSecondaryText?: string
  /** 首屏业绩数据条的口径说明（统计时间与来源），为空不显示 */
  heroStatsNote?: string
  /** 首页联系板块主标题，为空时用内置文案 */
  contactHeading?: string
  /** 公司全称 / 简称 / 英文名，为空时用 config/brand.ts 内置值 */
  companyName?: string
  companyShort?: string
  companyEn?: string
  /** 站点图标地址，为空时用 index.html 内置 favicon */
  favicon?: string
  /** 默认分享图：页面自身没有配图时分享卡片用这张 */
  shareImage?: string
  /** 首页板块顺序、显隐、标题与底色（后台「首页布局」），后端已补齐全部板块 */
  homeLayout?: HomeSectionConfig[]
  /** 页脚分栏、友情链接、社交账号（后台「页脚设置」） */
  footerConfig?: FooterConfig
  /** 统计、灰色模式、悬浮咨询条（后台「统计与显示」） */
  ext?: SiteExt
}

/** 前台可见的站点扩展配置，与后端 common/site-ext.ts 的 PublicSiteExt 一致 */
export interface SiteExt {
  /** 百度统计站点 ID */
  baiduTongji?: string
  /** GA4 衡量 ID */
  gaId?: string
  /** 灰色模式此刻是否生效（服务端按北京时间算好） */
  grayActive: boolean
  floatBar: {
    enabled: boolean
    showPhone: boolean
    showWechat: boolean
    /** 在线客服会话页地址，新窗口打开 */
    kefuUrl?: string
  }
}

/** 首屏之后可排序的首页板块 */
export type HomeSectionKey = 'business-trio' | 'advantage' | 'case' | 'news' | 'partner' | 'view' | 'contact'

/** 首页板块底色：auto 为模板默认的白 / 浅色交替 */
export type HomeTone = 'auto' | 'white' | 'surface' | 'dark'

export interface HomeSectionConfig {
  key: HomeSectionKey
  visible: boolean
  eyebrow?: string
  title?: string
  tone: HomeTone
}

export type SocialType = 'wechat' | 'weibo' | 'douyin' | 'channels' | 'bilibili' | 'linkedin'

export interface FooterConfig {
  /** 页脚显示的一级导航 key（按此顺序）；为空表示全部 */
  columns: string[]
  friendLinks: { name: string; url: string }[]
  socials: { type: SocialType; url?: string; qr?: string }[]
}

/** 板块标题：小标题取栏目名，主标题取栏目区块副标题；任一为空时前台用内置文案 */
export interface SectionHeading { eyebrow: string; title: string }

/** 「我眼中的中瑞恒」项：媒体报道、行业评价 */
export interface ViewItem {
  id: number; title: string; desc: string; image: string; link: string; sort: number
  /** 视频地址：配了就在图片位静音循环播放，image 作首帧 */
  video?: string
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
export interface ProductItem { id: number; name: string; summary: string; features: string[]; image: string; video?: string; sort: number }
/** 技术服务项 */
export interface ServiceItem { id: number; icon: string; title: string; desc: string }
/** 合作伙伴项 */
export interface PartnerItem {
  id: number
  name: string
  logo: string
  link: string
  sort: number
  /** 分组名：产业伙伴 / 科创伙伴 / 合作伙伴，空串表示未分组 */
  category?: string
}
/** 公司业绩项 */
export interface AchievementItem { id: number; value: number; suffix: string; label: string; sort: number }
/** 社会贡献项 */
export interface SocialItem { id: number; title: string; desc: string; image: string; video?: string; sort: number }

/** 愿景使命项（后端 home-vision 栏目，为空时首页不渲染） */
export interface VisionItem { id: number; title: string; desc: string }
/** 媒体采访与客户证言项（后端 home-testimony 栏目，无评价文案的条目不下发） */
export interface TestimonyItem { id: number; title: string; image: string; quote: ExtraQuote }
/** 资质与研发实力项（后端 home-honor 栏目） */
export interface HonorItem { id: number; title: string; desc: string; image: string }

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
  /** 「我眼中的中瑞恒」 */
  views?: ViewItem[]
  /** 愿景使命（新版首页） */
  vision?: VisionItem[]
  /** 媒体采访与客户证言（新版首页） */
  testimonies?: TestimonyItem[]
  /** 资质与研发实力（新版首页） */
  honors?: HonorItem[]
  /** 核心优势（第三版首页：方案定制 / 前卫设计 / 精工品质 / 完美配套） */
  advantages?: ServiceItem[]
  /** 各板块标题，key 为板块标识：about/business/product/service/philosophy/achievement/partner/view/social */
  headings?: Record<string, SectionHeading>
  /** 各板块背景图配置（来自后台），key 为板块标识：hero/about/business/product/service/philosophy/partner/achievement/social/contact，无值时用默认样式 */
  backgrounds?: Record<string, string>
}

/** 获取站点基本信息 */
export const getSiteInfo = () => get<SiteInfo>('/api/portal/site/detail')

/** 获取首页各板块聚合数据 */
export const getHomeSections = () => get<HomeSections>('/api/portal/home/sections')

// 在线留言提交已迁至 @/api/feedback（真实后端 /api/portal/feedback/*）

/**
 * 记录访客访问（埋点，失败由调用方静默忽略）
 * 上报栏目 key 而非栏目名：后台改栏目名时历史统计不会被割成两段
 * @param channelKey 一级栏目 key，如 home / hvac
 */
export const recordVisit = (channelKey: string) =>
  post<null>('/api/portal/visit/record', { channelKey })
