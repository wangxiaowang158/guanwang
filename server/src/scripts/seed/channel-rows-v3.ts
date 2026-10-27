// 第三版官网栏目种子 —— 依据《网站框架图第三版 09.21》
// 一级导航：首页 / 主营业务 / 智慧能源解决方案 / 智慧建筑解决方案 / 未来人居环境服务 / 生态联盟 / 关于我们
// 每个下拉项是一个独立页面（顶级栏目 + menuParent 挂靠），页面里的区块是其子栏目；
// 后台可照此在「栏目管理」里继续新增页面与区块，无需改代码
import type { ChannelRow } from './channel-rows'

const LIST_COLS = ['sort', 'title', 'createTime', 'isTop']

/** 各展示形态的内容表单字段：只开放该形态前台真正会读的字段 */
export const LAYOUT_FIELDS: Record<string, string[]> = {
  media: ['title', 'description', 'cover', 'video', 'isTop'],
  tiles: ['title', 'description', 'cover', 'video', 'link', 'isTop'],
  brand: ['title', 'subtitle', 'description', 'cover', 'video', 'content', 'isTop'],
  cards: ['title', 'description', 'cover', 'video', 'link', 'content', 'isTop'],
  rich: ['title', 'content', 'isTop'],
}

/** 页面定义 */
interface PageDef {
  key: string
  name: string
  /** 站内页面路径；外链栏目为 null */
  path: string | null
  sort: number
  icon: string
  /** 挂靠的一级菜单 key；缺省即自身就是一级菜单 */
  dock?: string
  eyebrow?: string
  title?: string
  desc?: string
  /** 导航外链（仅外链栏目） */
  externalUrl?: string
  /** 页面里的区块：[锚点, 区块名, 展示形态] */
  blocks?: [string, string, string][]
}

/** 总体解决方案页统一结构（三大解决方案共用） */
const OVERVIEW_BLOCKS: [string, string, string][] = [
  ['pains', '行业痛点', 'media'],
  ['solution', '解决方案', 'media'],
  ['path', '实现路径', 'media'],
  ['value', '客户价值', 'media'],
  ['scenes', '应用场景', 'tiles'],
]

/** 产品页统一结构（子智能体、平台、系统类页面共用） */
const PRODUCT_BLOCKS: [string, string, string][] = [
  ['intro', '产品介绍', 'media'],
  ['features', '产品功能', 'media'],
  ['highlights', '特色亮点', 'media'],
]

/** 产品页头图占位说明，框架图原文；由市场部在后台换成正式文案 */
const PRODUCT_DESC = '我是谁，我能解决什么问题，我获得哪些荣誉'

/** 三大业务页结构：定义 → 行业趋势 → 解决方案 → 品牌 → 客户价值 → 典型案例 */
function businessBlocks(extra: [string, string, string][] = []): [string, string, string][] {
  return [
    ['trend', '行业趋势', 'media'],
    ['solution', '解决方案', 'media'],
    ...extra,
    ['brand', '品牌介绍', 'brand'],
    ['value', '客户价值', 'tiles'],
    ['cases', '典型案例', 'cards'],
  ]
}

/** 主营业务：三个业务页（沿用 v2 的栏目 key 与路径，区块按框架图重排） */
const BUSINESS_PAGES: PageDef[] = [
  {
    key: 'business', name: '主营业务', path: '/business', sort: 20, icon: 'ApartmentOutlined',
    eyebrow: '主营业务', title: '智慧能源 · 智慧建筑 · 未来人居',
    desc: '覆盖能源系统、建筑与人居空间的全生命周期服务。',
  },
  {
    key: 'business-energy', name: '智慧能源', path: '/business/energy', sort: 21, icon: 'ThunderboltOutlined',
    dock: 'business', eyebrow: '智慧能源的定义', title: '智慧能源',
    desc: '以能源智能体贯通咨询、设计、建造、运行、巡检、运维全过程，让设计意图 100% 传递到运行端。',
    blocks: businessBlocks([['dotr', '能效达成率指标', 'media']]),
  },
  {
    key: 'business-building', name: '智慧建筑', path: '/business/building', sort: 22, icon: 'BankOutlined',
    dock: 'business', eyebrow: '智慧建筑的定义', title: '智慧建筑',
    desc: '构建建筑生命体：躯体、神经、心血管、免疫、大脑、四肢协同，赋予建筑生命，让人与空间共生。',
    blocks: businessBlocks(),
  },
  {
    key: 'business-living', name: '未来人居', path: '/business/living', sort: 23, icon: 'BulbOutlined',
    dock: 'business', eyebrow: '未来人居的定义', title: '未来人居',
    desc: '以科技赋能空间，以系统守护生命，为人创造健康、舒适、安全、智慧的工作与生活环境。',
    blocks: businessBlocks(),
  },
]

/** 智慧能源解决方案：总体 + 6 个子智能体 + 一体化高效机房 */
const ENERGY_PAGES: PageDef[] = [
  {
    key: 'energy-solutions', name: '智慧能源解决方案', path: '/energy-solutions', sort: 30, icon: 'ThunderboltOutlined',
    eyebrow: '智慧能源解决方案', title: '智慧能源解决方案', desc: '基于统一底座，6 个智能体全生命期协作。',
  },
  {
    key: 'es-overview', name: '总体解决方案', path: '/energy-solutions/overview', sort: 300, icon: 'ClusterOutlined',
    dock: 'energy-solutions', title: '总体解决方案',
    desc: '基于统一底座，6个智能体全生命期协作，真正高效能源系统', blocks: OVERVIEW_BLOCKS,
  },
  ...([
    ['es-consult', '节能咨询子智能体', 'consult'],
    ['es-design', '选型设计子智能体', 'design'],
    ['es-build', '智能建造子智能体', 'build'],
    ['es-operate', '运行调控子智能体', 'operate'],
    ['es-inspect', '值守巡检子智能体', 'inspect'],
    ['es-maintain', '运维保障子智能体', 'maintain'],
    ['es-room', '一体化高效机房', 'machine-room'],
  ] as const).map<PageDef>(([key, name, slug], i) => ({
    key, name, path: `/energy-solutions/${slug}`, sort: 301 + i, icon: 'AppstoreOutlined',
    dock: 'energy-solutions', title: name, desc: PRODUCT_DESC, blocks: PRODUCT_BLOCKS,
  })),
]

/** 智慧建筑解决方案：总体 + 4 个产品页 */
const BUILDING_PAGES: PageDef[] = [
  {
    key: 'building-solutions', name: '智慧建筑解决方案', path: '/building-solutions', sort: 40, icon: 'BankOutlined',
    eyebrow: '智慧建筑解决方案', title: '智慧建筑解决方案', desc: '让建筑拥有生命体征，安全与能源双闭环管理。',
  },
  {
    key: 'bs-overview', name: '总体解决方案', path: '/building-solutions/overview', sort: 400, icon: 'ClusterOutlined',
    dock: 'building-solutions', title: '总体解决方案', desc: '构建建筑生命体，赋予建筑生命，让人与空间共生',
    blocks: OVERVIEW_BLOCKS,
  },
  ...([
    ['bs-platform', '智慧建筑综合运营管理平台', 'platform'],
    ['bs-twin', '数字孪生构建器', 'digital-twin'],
    ['bs-turing', '图灵BOX系列产品', 'turing-box'],
    ['bs-safety', '智慧安全管控系统', 'safety'],
  ] as const).map<PageDef>(([key, name, slug], i) => ({
    key, name, path: `/building-solutions/${slug}`, sort: 401 + i, icon: 'AppstoreOutlined',
    dock: 'building-solutions', title: name, desc: PRODUCT_DESC, blocks: PRODUCT_BLOCKS,
  })),
]

/** 未来人居环境服务：总体 + 房间中枢 + LIVEX 系统 + 小鹿爱家技术服务（外链） */
const LIVING_PAGES: PageDef[] = [
  {
    key: 'living-services', name: '未来人居环境服务', path: '/living-services', sort: 50, icon: 'HomeOutlined',
    eyebrow: '未来人居环境服务', title: '未来人居环境服务', desc: '打造未来理想人居空间环境系统。',
  },
  {
    key: 'ls-overview', name: '总体解决方案', path: '/living-services/overview', sort: 500, icon: 'ClusterOutlined',
    dock: 'living-services', title: '总体解决方案',
    desc: '为人创造健康、舒适、安全、智慧的工作与生活环境', blocks: OVERVIEW_BLOCKS,
  },
  {
    key: 'ls-room', name: '房间中枢', path: '/living-services/room-hub', sort: 501, icon: 'AppstoreOutlined',
    dock: 'living-services', title: '房间中枢', desc: PRODUCT_DESC, blocks: PRODUCT_BLOCKS,
  },
  {
    key: 'ls-livex', name: 'LIVEX系统', path: '/living-services/livex', sort: 502, icon: 'AppstoreOutlined',
    dock: 'living-services', title: 'LIVEX系统', desc: PRODUCT_DESC, blocks: PRODUCT_BLOCKS,
  },
  // 外链地址由运营在后台「栏目管理」里填写；未填时不出现在导航里
  { key: 'ls-xiaolu', name: '小鹿爱家技术服务', path: null, sort: 503, icon: 'LinkOutlined', dock: 'living-services' },
]

/** 第三版全部页面 */
export const V3_PAGES: PageDef[] = [...BUSINESS_PAGES, ...ENERGY_PAGES, ...BUILDING_PAGES, ...LIVING_PAGES]

/** 生态联盟、关于我们的新导航顺序：排在三大解决方案之后 */
export const V3_SORTS: Record<string, number> = { home: 10, alliance: 60, about: 70 }

/**
 * 改版后不再对外的页面与区块：只隐藏，栏目与内容保留，后台可随时恢复
 * - 核心产品 / 行业解决方案 / 项目案例三个一级页，内容已并入三大解决方案与业务页的典型案例
 * - 业务页 v2 的痛点 / 流程 / 产品 / 指标 / 合作模式区块，框架图第三版不再有
 */
export const V3_RETIRED_KEYS = [
  'products', 'solutions', 'case',
  // 首页改版后不再展示的板块（首页现为：首屏 / 三大业务 / 核心优势 / 新闻 / 战略合作 / 我眼中的中瑞恒 / 联系）
  'home-intro', 'home-vision', 'home-business', 'home-product', 'home-service', 'home-philosophy',
  'home-achievement', 'home-social', 'home-testimony', 'home-honor',
  ...['business-energy', 'business-building', 'business-living'].flatMap(top =>
    ['pains', 'flow', 'products', 'metrics', 'modes'].map(s => `${top}-${s}`)),
]

/** 页面 → 栏目行 */
function pageRow(d: PageDef): ChannelRow {
  return {
    parentKey: null, key: d.key, name: d.name, type: 'group', icon: d.icon, sort: d.sort,
    formFields: [], listColumns: [], seoTitle: null, seoKeywords: null, seoDescription: null,
    portalPath: d.path, anchor: null, subheading: null, layout: null,
    heroEyebrow: d.eyebrow ?? null, heroTitle: d.title ?? null, heroDesc: d.desc ?? null,
    menuParent: d.dock ?? null, menuGroup: null, menuDesc: null,
    externalUrl: d.externalUrl ?? null,
  }
}

/** 区块 → 子栏目行；key 为「页面 key-锚点」 */
function blockRow(page: PageDef, [anchor, name, layout]: [string, string, string], index: number): ChannelRow {
  return {
    parentKey: page.key, key: `${page.key}-${anchor}`, name, type: 'list', icon: null, sort: 10 + index,
    formFields: LAYOUT_FIELDS[layout] ?? LAYOUT_FIELDS.cards, listColumns: LIST_COLS,
    seoTitle: null, seoKeywords: null, seoDescription: null,
    portalPath: null, anchor, subheading: null, layout,
    heroEyebrow: null, heroTitle: null, heroDesc: null,
  }
}

/**
 * 首页板块（第三版）：首屏 → 三大业务 → 核心优势 → 新闻资讯 → 战略合作 → 我眼中的中瑞恒 → 联系
 * 三大业务取自业务页、新闻取自新闻资讯页，不另建栏目；这里只建/改写有独立内容的板块
 */
function homeRows(): ChannelRow[] {
  const base = {
    parentKey: 'home', type: 'list', icon: null, seoTitle: null, seoKeywords: null, seoDescription: null,
    portalPath: null, anchor: null, layout: null, heroEyebrow: null, heroTitle: null, heroDesc: null,
  }
  return [
    {
      ...base, key: 'home-advantage', name: '核心优势', sort: 2, subheading: '从方案到交付的全程保障',
      formFields: ['icon', 'title', 'description', 'isTop'], listColumns: LIST_COLS,
    },
    {
      // 合作伙伴按「产业伙伴 / 科创伙伴 / 合作伙伴」分三组展示，分组名填在「分类」
      ...base, key: 'home-customer', name: '战略合作', sort: 4, subheading: '产业伙伴 · 科创伙伴 · 合作伙伴',
      formFields: ['title', 'category', 'whiteCover', 'link', 'isTop'], listColumns: ['sort', 'title', 'category', 'createTime', 'isTop'],
    },
  ]
}

/** 第三版新增与重排的全部栏目行 */
export function buildV3Rows(): ChannelRow[] {
  return [
    ...V3_PAGES.flatMap(p => [pageRow(p), ...(p.blocks ?? []).map((b, i) => blockRow(p, b, i))]),
    ...homeRows(),
  ]
}

/** 第三版种子首次入库的判定栏目：库里没有它，说明还没升级到第三版 */
export const V3_MARKER_KEY = 'energy-solutions'
