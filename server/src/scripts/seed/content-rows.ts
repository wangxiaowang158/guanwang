// 内容种子行构造 —— 前台展示数据为准，admin mock 只补前台没有的栏目
// 两份 mock 在 hvac-category / hvac-product / case-industry 上并存且内容有出入，
// 前台是用户实际看到的，故以前台为准；admin 独有的 home-view 等栏目原样保留
import adminContents from '../../modules/cms/seed/contents.json'
import backgrounds from '../../modules/cms/seed/backgrounds.json'
import homeSections from '../../modules/cms/seed/home-sections.json'
import pageContents from '../../modules/cms/seed/page-contents.json'
import webSite from '../../modules/cms/seed/web-site.json'
import { HOME_SECTION_KEYS } from '../../modules/cms/home-section.service'

/** 待写入的内容行，字段名与实体一致 */
export interface ContentRow {
  channelKey: string
  title?: string | null
  name?: string | null
  subtitle?: string | null
  description?: string | null
  content?: string | null
  cover?: string | null
  whiteCover?: string | null
  link?: string | null
  category?: string | null
  icon?: string | null
  sort: number
  isTop?: boolean
  publishAt?: Date | null
}

type PageMap = Record<string, {
  blocks: { anchor: string; items: { title: string; desc?: string; tag?: string; date?: string }[] }[]
}>

const PAGES = pageContents as PageMap

/** 前台数据覆盖的栏目，admin mock 中同名栏目一律跳过 */
const WEB_OWNED_CHANNELS = new Set<string>()

/** `YYYY-M-D H:mm:ss` 与 `YYYY-MM-DD` 都能解析，非法值返回 null */
function parseDate(raw?: string): Date | null {
  if (!raw) return null
  const d = new Date(raw.replace(/-/g, '/'))
  return Number.isNaN(d.getTime()) ? null : d
}

/**
 * 按数组下标生成降序 sort 值
 * 后台列表按 sort 降序展示，故下标 0 取最大值，保证与数组顺序一致
 */
function descSort(total: number, index: number): number {
  return total - index
}

/** 栏目页区块内容：8 个页面的全部条目 */
function buildPageRows(): ContentRow[] {
  const rows: ContentRow[] = []
  for (const [pageKey, page] of Object.entries(PAGES)) {
    for (const block of page.blocks) {
      const channelKey = `${pageKey}-${block.anchor}`
      WEB_OWNED_CHANNELS.add(channelKey)
      block.items.forEach((item, i) => {
        rows.push({
          channelKey,
          title: item.title,
          description: item.desc ?? null,
          category: item.tag ?? null,
          sort: descSort(block.items.length, i),
          publishAt: parseDate(item.date),
        })
      })
    }
  }
  return rows
}

/** 首页各板块内容 */
function buildHomeRows(): ContentRow[] {
  const s = homeSections as {
    business: { icon: string; title: string; desc: string }[]
    products: { name: string; summary: string; features: string[]; image: string }[]
    services: { icon: string; title: string; desc: string }[]
    partners: { name: string; logo: string; link: string }[]
    achievements: { value: number; suffix: string; label: string }[]
    social: { title: string; desc: string; image: string }[]
  }
  const K = HOME_SECTION_KEYS
  const rows: ContentRow[] = []

  // 公司简介与经营理念各一条，正文存 content
  rows.push({
    channelKey: K.ABOUT,
    title: webSite.about.title,
    subtitle: webSite.about.subtitle ?? null,
    content: webSite.about.content,
    sort: 1,
    isTop: true,
  })
  rows.push({
    channelKey: K.PHILOSOPHY,
    title: webSite.philosophy.title,
    content: webSite.philosophy.content,
    sort: 1,
  })

  s.business.forEach((b, i) => rows.push({
    channelKey: K.BUSINESS,
    title: b.title,
    description: b.desc,
    icon: b.icon,
    sort: descSort(s.business.length, i),
  }))

  // 产品特性列表按换行存入正文，前台再拆回数组
  s.products.forEach((p, i) => rows.push({
    channelKey: K.PRODUCT,
    name: p.name,
    subtitle: p.summary,
    content: p.features.join('\n'),
    cover: p.image || null,
    sort: descSort(s.products.length, i),
  }))

  s.services.forEach((v, i) => rows.push({
    channelKey: K.SERVICE,
    title: v.title,
    description: v.desc,
    icon: v.icon,
    sort: descSort(s.services.length, i),
  }))

  s.partners.forEach((p, i) => rows.push({
    channelKey: K.PARTNER,
    title: p.name,
    whiteCover: p.logo || null,
    link: p.link || null,
    sort: descSort(s.partners.length, i),
  }))

  // 业绩数字：数值存 title，单位存 subtitle，说明存 description
  s.achievements.forEach((a, i) => rows.push({
    channelKey: K.ACHIEVEMENT,
    title: String(a.value),
    subtitle: a.suffix,
    description: a.label,
    sort: descSort(s.achievements.length, i),
  }))

  s.social.forEach((v, i) => rows.push({
    channelKey: K.SOCIAL,
    title: v.title,
    description: v.desc,
    cover: v.image || null,
    sort: descSort(s.social.length, i),
  }))

  return rows
}

/** Banner 内容：页面头图存在对应 banner-* 栏目的封面字段 */
function buildBannerRows(): ContentRow[] {
  const bg = backgrounds as { home: Record<string, string>; pageHero: Record<string, string> }
  const rows: ContentRow[] = []

  if (bg.home?.hero) {
    rows.push({ channelKey: 'banner-home', title: '首页头图', cover: bg.home.hero, sort: 1 })
  }
  for (const [pageKey, image] of Object.entries(bg.pageHero ?? {})) {
    rows.push({ channelKey: `banner-${pageKey}`, title: `${pageKey} 头图`, cover: image, sort: 1 })
  }
  return rows
}

/** admin mock 独有的内容：前台已覆盖的栏目跳过，避免同一批数据两个版本并存 */
function buildAdminOnlyRows(): ContentRow[] {
  const byChannel = new Map<string, typeof adminContents>()
  for (const c of adminContents) {
    if (WEB_OWNED_CHANNELS.has(c.channelKey)) continue
    // 首页简介与主营业务已由 home-sections 覆盖
    if (c.channelKey === HOME_SECTION_KEYS.ABOUT || c.channelKey === HOME_SECTION_KEYS.BUSINESS) continue
    const list = byChannel.get(c.channelKey) ?? []
    list.push(c)
    byChannel.set(c.channelKey, list)
  }

  const rows: ContentRow[] = []
  for (const [channelKey, list] of byChannel) {
    // 这些栏目 mock 里已有有意义的 sort 值且与数组顺序一致，原样保留
    list.forEach((c) => rows.push({
      channelKey,
      title: c.title ?? null,
      sort: c.sort ?? 0,
      isTop: c.isTop ?? false,
      publishAt: parseDate(c.createTime),
    }))
  }
  return rows
}

/** 组装全部内容行。顺序有依赖：页面数据先跑，才能标记出前台已覆盖的栏目 */
export function buildContentRows(): ContentRow[] {
  const pageRows = buildPageRows()
  return [
    ...pageRows,
    ...buildHomeRows(),
    ...buildBannerRows(),
    ...buildAdminOnlyRows(),
  ]
}
