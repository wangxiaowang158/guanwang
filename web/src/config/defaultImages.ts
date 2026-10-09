// 缺省配图 —— 后台未上传图片（或图片加载失败）时，前台按栏目主题显示的内置插画
//
// 只在前台兜底，不写进数据库：后台仍能看出哪些条目没传图，传了真图后自动替换。
// Logo、微信二维码、合作伙伴 Logo 不在此列——这三类伪造出来会误导访客，继续回落为文字。
import hvac from '@/assets/defaults/hvac.svg'
import energy from '@/assets/defaults/energy.svg'
import smart from '@/assets/defaults/smart.svg'
import household from '@/assets/defaults/household.svg'
import caseImg from '@/assets/defaults/case.svg'
import news from '@/assets/defaults/news.svg'
import alliance from '@/assets/defaults/alliance.svg'
import about from '@/assets/defaults/about.svg'

/** 一级栏目 key → 缺省配图 */
const BY_PAGE: Record<string, string> = {
  hvac,
  energy,
  smart,
  household,
  case: caseImg,
  news,
  alliance,
  about,
  // 新版官网栏目：按内容主题复用既有插画，未单独出图
  business: about,
  'business-energy': energy,
  'business-building': smart,
  'business-living': household,
  products: hvac,
  solutions: caseImg,
}

/** 首页各板块的缺省配图，按板块内容主题挑选 */
export const HOME_DEFAULT_IMAGES = {
  /** 首屏背景：后台未配背景图、也没有首页 Banner 时 */
  hero: about,
  /** 主要产品 */
  product: hvac,
  /** 我眼中的中瑞恒 */
  view: news,
  /** 社会贡献 */
  social: about,
} as const

/**
 * 取一级栏目页的缺省配图，用于栏目页头图与图文条目
 * @param pageKey 一级栏目标识；未登记的栏目回落到通用的企业插画
 */
export function defaultImageOf(pageKey: string): string {
  return BY_PAGE[pageKey] ?? about
}
