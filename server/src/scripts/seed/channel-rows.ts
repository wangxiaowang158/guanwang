// 栏目种子行构造 —— 把 mock 导出的 channels.json 补上前台呈现字段后交给写库脚本
// 原 mock 里「前台怎么展示」写死在 web 代码里，这里把它归位到栏目配置上
import channels from '../../modules/cms/seed/channels.json'
import pageContents from '../../modules/cms/seed/page-contents.json'
import { HOME_FORM_FIELDS, HOME_HEADINGS, HOME_LIST_COLUMNS } from './home-form-fields'
import {
  FLATTEN_TO_LIST, FLATTEN_TO_SINGLE, FLATTENED_FORM_FIELDS, FLATTENED_KEYS, FLATTENED_LIST_COLUMNS,
} from './flatten-groups'
import { V2_OVERRIDES, buildV2Rows, isLegacyKey } from './channel-rows-v2'

/** 顶级栏目 → 前台路由路径。不在表内的栏目不对前台开放 */
export const PORTAL_PATHS: Record<string, string> = {
  home: '/',
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
  /** 菜单挂靠的顶级栏目 key；缺省不挂靠 */
  menuParent?: string | null
  menuGroup?: string | null
  menuDesc?: string | null
  /** 仅新建时生效：改版后不再对外的旧页面隐藏，已存在的栏目不改，尊重后台已有设置 */
  hidden?: boolean
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
    // 被拍平区块的孙栏目前台不读，不再建出来（见 flatten-groups.ts）
    if (parentKey && FLATTENED_KEYS.has(parentKey)) continue
    const flattenedType = FLATTEN_TO_LIST.includes(c.key) ? 'list'
      : FLATTEN_TO_SINGLE.includes(c.key) ? 'single' : null
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
      // 首页板块不走页面区块数据，标题取 HOME_HEADINGS（与改版前前台写死的文案一致）
      name: block?.heading ?? HOME_HEADINGS[c.key]?.name ?? c.name,
      type: flattenedType ?? c.type,
      icon: c.icon ?? null,
      sort: c.sort,
      formFields: flattenedType
        ? FLATTENED_FORM_FIELDS[flattenedType]
        : HOME_FORM_FIELDS[c.key] ?? c.formFields ?? [],
      listColumns: flattenedType
        ? FLATTENED_LIST_COLUMNS
        : HOME_LIST_COLUMNS[c.key] ?? c.listColumns ?? [],
      seoTitle: c.seoTitle ?? null,
      seoKeywords: c.seoKeywords ?? null,
      seoDescription: c.seoDescription ?? null,
      portalPath: isPortalTop ? PORTAL_PATHS[c.key] : null,
      anchor,
      subheading: block?.subheading ?? HOME_HEADINGS[c.key]?.subheading ?? null,
      layout: block?.layout ?? null,
      heroEyebrow: page?.hero.eyebrow ?? null,
      heroTitle: page?.hero.title ?? null,
      heroDesc: page?.hero.desc ?? null,
    })
  }

  rows.push(...buildNewChildRows())
  rows.push(...buildNewHomeRows())
  // 新版官网：既有栏目套菜单/排序覆盖，再追加新增的一级与子级栏目
  for (const row of rows) Object.assign(row, V2_OVERRIDES[row.key])
  rows.push(...buildV2Rows())
  // 旧版四个页面及其子栏目、头图栏目不再生成
  return rows.filter(r => !isLegacyKey(r.key))
}

/** alliance / about 两页缺失的子栏目 */
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
    name: HOME_HEADINGS[def.key]?.name ?? def.name,
    type: 'list',
    icon: null,
    sort: 10 + index,
    formFields: HOME_FORM_FIELDS[def.key] ?? DEFAULT_FORM_FIELDS,
    listColumns: HOME_LIST_COLUMNS[def.key] ?? DEFAULT_LIST_COLUMNS,
    seoTitle: null,
    seoKeywords: null,
    seoDescription: null,
    portalPath: null,
    anchor: null,
    subheading: HOME_HEADINGS[def.key]?.subheading ?? null,
    layout: null,
    heroEyebrow: null,
    heroTitle: null,
    heroDesc: null,
  }))
}
