// 栏目种子行构造 —— 把 mock 导出的 channels.json 补上前台呈现字段后交给写库脚本
// 原 mock 里「前台怎么展示」写死在 web 代码里，这里把它归位到栏目配置上
import channels from '../../modules/cms/seed/channels.json'
import pageContents from '../../modules/cms/seed/page-contents.json'

/** 顶级栏目 → 前台路由路径。不在表内的栏目不对前台开放 */
export const PORTAL_PATHS: Record<string, string> = {
  home: '/',
  hvac: '/hvac',
  energy: '/energy',
  smart: '/smart',
  household: '/household',
  case: '/case',
  news: '/news',
  alliance: '/alliance',
  about: '/about',
}

/**
 * 原 mock 中前台有区块、后台却没有对应子栏目的节点
 * 缺了它们这三个页面的内容在后台完全无法编辑
 */
export const NEW_CHILD_CHANNELS = [
  { parentKey: 'household', key: 'household-feature', name: '产品特性' },
  { parentKey: 'alliance', key: 'alliance-partner', name: '联盟成员' },
  { parentKey: 'alliance', key: 'alliance-join', name: '加入方式' },
  { parentKey: 'about', key: 'about-profile', name: '公司概况' },
  { parentKey: 'about', key: 'about-honor', name: '资质荣誉' },
  { parentKey: 'about', key: 'about-social', name: '社会责任' },
]

/** 首页板块中原 mock 无对应后台栏目的部分 */
export const NEW_HOME_CHANNELS = [
  { key: 'home-philosophy', name: '经营理念' },
  { key: 'home-product', name: '主要产品' },
  { key: 'home-service', name: '技术服务' },
  { key: 'home-achievement', name: '公司业绩' },
  { key: 'home-social', name: '社会贡献' },
]

/** 内容型栏目的通用表单字段，新增子栏目沿用 mock 中同类栏目的配置 */
const DEFAULT_FORM_FIELDS = [
  'title', 'keywords', 'description', 'content', 'cover', 'updateTime', 'author', 'source', 'isTop',
]
const DEFAULT_LIST_COLUMNS = ['sort', 'title', 'createTime', 'isTop']

/** 待写入的栏目行 */
export interface ChannelRow {
  id?: number
  parentKey: string | null
  key: string
  name: string
  type: string
  icon: string | null
  sort: number
  formFields: string[]
  listColumns: string[]
  seoTitle: string | null
  seoKeywords: string | null
  seoDescription: string | null
  portalPath: string | null
  anchor: string | null
  subheading: string | null
  layout: string | null
  heroEyebrow: string | null
  heroTitle: string | null
  heroDesc: string | null
}

type RawChannel = (typeof channels)[number]
type PageMap = Record<string, {
  hero: { eyebrow: string; title: string; desc: string }
  blocks: { anchor: string; heading: string; subheading?: string; layout: string }[]
}>

const PAGES = pageContents as PageMap

/** 子栏目 key 去掉父前缀即为锚点，如 hvac-category → category */
function anchorOf(parentKey: string, key: string): string {
  return key.startsWith(`${parentKey}-`) ? key.slice(parentKey.length + 1) : key
}

/** 在页面数据里找该子栏目对应的区块，取展示形态与副标题 */
function blockOf(parentKey: string, anchor: string) {
  return PAGES[parentKey]?.blocks.find(b => b.anchor === anchor)
}

/** 组装全部栏目行：mock 原有节点 + 前台需要但后台缺失的节点 */
export function buildChannelRows(): ChannelRow[] {
  const byId = new Map<number, RawChannel>(channels.map(c => [c.id, c]))
  const rows: ChannelRow[] = []

  for (const c of channels) {
    const parent = c.parentId ? byId.get(c.parentId) : undefined
    const parentKey = parent?.key ?? null
    const isPortalTop = !parentKey && PORTAL_PATHS[c.key] !== undefined
    const page = isPortalTop ? PAGES[c.key] : undefined

    // 子栏目只有在前台页面里确有对应区块时才给锚点
    // 首页板块由固定版式渲染、不靠锚点定位，其子栏目因此取不到区块，锚点为空
    const candidate = parentKey && PORTAL_PATHS[parentKey] ? anchorOf(parentKey, c.key) : null
    const block = candidate && parentKey ? blockOf(parentKey, candidate) : undefined
    const anchor = block ? candidate : null

    rows.push({
      id: c.id,
      parentKey,
      key: c.key,
      // 前台区块标题即用户可见文案，与 mock 里的后台栏目名不一致时以前台为准
      name: block?.heading ?? c.name,
      type: c.type,
      icon: c.icon ?? null,
      sort: c.sort,
      formFields: c.formFields ?? [],
      listColumns: c.listColumns ?? [],
      seoTitle: c.seoTitle ?? null,
      seoKeywords: c.seoKeywords ?? null,
      seoDescription: c.seoDescription ?? null,
      portalPath: isPortalTop ? PORTAL_PATHS[c.key] : null,
      anchor,
      subheading: block?.subheading ?? null,
      layout: block?.layout ?? null,
      heroEyebrow: page?.hero.eyebrow ?? null,
      heroTitle: page?.hero.title ?? null,
      heroDesc: page?.hero.desc ?? null,
    })
  }

  rows.push(...buildNewChildRows())
  rows.push(...buildNewHomeRows())
  return rows
}

/** household / alliance / about 三页缺失的子栏目 */
function buildNewChildRows(): ChannelRow[] {
  return NEW_CHILD_CHANNELS.map((def, index) => {
    const anchor = anchorOf(def.parentKey, def.key)
    const block = blockOf(def.parentKey, anchor)
    return {
      parentKey: def.parentKey,
      key: def.key,
      name: block?.heading ?? def.name,
      type: 'list',
      icon: null,
      sort: index + 1,
      formFields: DEFAULT_FORM_FIELDS,
      listColumns: DEFAULT_LIST_COLUMNS,
      seoTitle: null,
      seoKeywords: null,
      seoDescription: null,
      portalPath: null,
      anchor,
      subheading: block?.subheading ?? null,
      layout: block?.layout ?? 'cards',
      heroEyebrow: null,
      heroTitle: null,
      heroDesc: null,
    }
  })
}

/** 首页缺失的板块栏目。首页板块由前台固定版式渲染，不需要锚点与展示形态 */
function buildNewHomeRows(): ChannelRow[] {
  return NEW_HOME_CHANNELS.map((def, index) => ({
    parentKey: 'home',
    key: def.key,
    name: def.name,
    type: 'list',
    icon: null,
    sort: 10 + index,
    formFields: DEFAULT_FORM_FIELDS,
    listColumns: DEFAULT_LIST_COLUMNS,
    seoTitle: null,
    seoKeywords: null,
    seoDescription: null,
    portalPath: null,
    anchor: null,
    subheading: null,
    layout: null,
    heroEyebrow: null,
    heroTitle: null,
    heroDesc: null,
  }))
}
