// 新版官网栏目种子 —— 7 大一级导航：首页 / 主营业务 / 核心产品 / 行业解决方案 / 项目案例 / 生态联盟 / 关于我们
// 与旧栏目并存：只新增，不删除不改名；旧的暖通/综合能源/智慧能源/智能家居四页仅在新建库时隐藏
import type { ChannelRow } from './channel-rows'

/** 栏目通用表单字段：扩展内容类字段按版式挑选 */
const BASE_FIELDS = ['title', 'description', 'cover', 'link', 'isTop']
const LIST_COLS = ['sort', 'title', 'createTime', 'isTop']

/** 九大行业，案例与解决方案共用；后台「所属行业」标签与此对应 */
export const INDUSTRIES = [
  '医院', '高校', '政府机关', '商业园区', '交通', '洁净空间', '数据中心', '工业园区', '住宅',
] as const

interface TopDef {
  key: string
  name: string
  path: string
  sort: number
  /** 后台侧边栏图标（Ant Design 图标名） */
  icon: string
  eyebrow: string
  title: string
  desc: string
  menuParent?: string
  menuGroup?: string
  menuDesc?: string
}

interface ChildDef {
  parent: string
  key: string
  name: string
  layout: string
  subheading?: string
  fields: string[]
}

/** 新增的一级页面 */
const TOPS: TopDef[] = [
  {
    key: 'business', name: '主营业务', path: '/business', sort: 20, icon: 'ApartmentOutlined',
    eyebrow: '主营业务', title: '智慧能源 · 智慧建筑 · 未来人居',
    desc: '覆盖全生命周期、全场景服务，从能源系统到建筑再到人居空间。',
  },
  {
    key: 'business-energy', name: '智慧能源', path: '/business/energy', sort: 21, icon: 'ThunderboltOutlined', menuParent: 'business',
    menuGroup: '三大业务', menuDesc: '能耗高、运维贵、改造投资压力大？',
    eyebrow: '智慧能源', title: '能耗居高不下？让能源系统自己会省电',
    desc: 'iHeesd 设计软件 + 图灵 BOX + EMS 能源托管，EMC 零投资模式。',
  },
  {
    key: 'business-building', name: '智慧建筑', path: '/business/building', sort: 22, icon: 'BankOutlined', menuParent: 'business',
    menuGroup: '三大业务', menuDesc: '多系统独立、运维繁琐、预警滞后？',
    eyebrow: '智慧建筑', title: '楼宇系统各管各的？一个平台管到底',
    desc: 'IBESS 一体化管控 + iBuilder 数字孪生，安全与能源双闭环管理。',
  },
  {
    key: 'business-living', name: '未来人居', path: '/business/living', sort: 23, icon: 'BulbOutlined', menuParent: 'business',
    menuGroup: '三大业务', menuDesc: '设备分散、温湿度失衡、难联动？',
    eyebrow: '未来人居', title: '家里设备各自为政？让全屋像一个整体',
    desc: '全屋五恒新风净水地暖一体化，房间边缘中枢云边协同智控。',
  },
  {
    key: 'products', name: '核心产品', path: '/products', sort: 30, icon: 'AppstoreOutlined',
    eyebrow: '核心产品', title: '能源智能体 · 建筑生命体 · 未来人居',
    desc: '全国产自研底座，全协议兼容，支持定制开发。',
  },
  {
    key: 'solutions', name: '行业解决方案', path: '/solutions', sort: 40, icon: 'SolutionOutlined',
    eyebrow: '行业解决方案', title: '每个行业的痛点不同，方案也该不同',
    desc: '医院、高校、政府机关、商业园区、交通、洁净空间、数据中心、工业园区、住宅。',
  },
]

/** 三大业务页统一结构：痛点 → 流程 → 产品 → 价值 → 案例 → 合作模式 */
function businessChildren(top: string): ChildDef[] {
  return [
    { parent: top, key: `${top}-pains`, name: '客户共性痛点', layout: 'pains', fields: ['title', 'pains', 'isTop'] },
    { parent: top, key: `${top}-flow`, name: '全链条服务流程', layout: 'flow', fields: ['title', 'steps', 'isTop'] },
    { parent: top, key: `${top}-products`, name: '核心自研产品', layout: 'cards', fields: BASE_FIELDS },
    { parent: top, key: `${top}-metrics`, name: '落地价值', layout: 'metrics', fields: ['title', 'metrics', 'isTop'] },
    { parent: top, key: `${top}-cases`, name: '标杆案例', layout: 'cards', fields: [...BASE_FIELDS, 'business', 'industries', 'tags'] },
    { parent: top, key: `${top}-modes`, name: '合作模式', layout: 'modes', fields: ['title', 'modes', 'isTop'] },
  ]
}

const CHILDREN: ChildDef[] = [
  ...businessChildren('business-energy'),
  ...businessChildren('business-building'),
  ...businessChildren('business-living'),
  { parent: 'products', key: 'products-list', name: '产品矩阵', layout: 'cards', fields: [...BASE_FIELDS, 'business', 'tags', 'content'] },
  { parent: 'solutions', key: 'solutions-list', name: '行业方案', layout: 'cards', fields: [...BASE_FIELDS, 'industries', 'tags', 'content'] },
  { parent: 'case', key: 'case-featured', name: '标杆案例', layout: 'cards', fields: [...BASE_FIELDS, 'business', 'industries', 'tags', 'metrics', 'content'] },
  { parent: 'home', key: 'home-vision', name: '愿景使命', layout: 'cards', fields: ['title', 'description', 'isTop'] },
  { parent: 'home', key: 'home-testimony', name: '媒体采访与客户证言', layout: 'quote', fields: ['title', 'cover', 'quote', 'isTop'] },
  { parent: 'home', key: 'home-honor', name: '资质与研发实力', layout: 'cards', fields: ['title', 'description', 'cover', 'isTop'] },
  // 生态联盟：特聘专家 / 战略联盟 / 产学研 / 渠道合作 / 合作伙伴（联盟成员、加入方式沿用旧栏目）
  { parent: 'alliance', key: 'alliance-expert', name: '特聘专家', layout: 'cards', fields: BASE_FIELDS },
  { parent: 'alliance', key: 'alliance-strategic', name: '战略联盟', layout: 'cards', fields: BASE_FIELDS },
  { parent: 'alliance', key: 'alliance-research', name: '产学研', layout: 'cards', fields: [...BASE_FIELDS, 'content'] },
  { parent: 'alliance', key: 'alliance-channel', name: '渠道合作', layout: 'cards', fields: [...BASE_FIELDS, 'content'] },
  { parent: 'alliance', key: 'alliance-partners', name: '合作伙伴', layout: 'cards', fields: ['title', 'whiteCover', 'link', 'isTop'] },
  // 关于我们：分支机构替换原高管团队，另补发展历程与加入我们
  { parent: 'about', key: 'about-branch', name: '分支机构', layout: 'cards', fields: BASE_FIELDS },
  { parent: 'about', key: 'about-history', name: '发展历程', layout: 'steps', fields: ['title', 'description', 'isTop'] },
  { parent: 'about', key: 'about-join', name: '加入我们', layout: 'rich', fields: ['title', 'content', 'isTop'] },
]

function topRow(d: TopDef): ChannelRow {
  return {
    parentKey: null, key: d.key, name: d.name, type: 'group', icon: d.icon, sort: d.sort,
    formFields: [], listColumns: [], seoTitle: null, seoKeywords: null, seoDescription: null,
    portalPath: d.path, anchor: null, subheading: null, layout: null,
    heroEyebrow: d.eyebrow, heroTitle: d.title, heroDesc: d.desc,
    menuParent: d.menuParent ?? null, menuGroup: d.menuGroup ?? null, menuDesc: d.menuDesc ?? null,
  }
}

function childRow(d: ChildDef, index: number): ChannelRow {
  const anchor = d.key.startsWith(`${d.parent}-`) ? d.key.slice(d.parent.length + 1) : d.key
  const isHome = d.parent === 'home'
  return {
    parentKey: d.parent, key: d.key, name: d.name, type: 'list', icon: null, sort: 30 + index,
    formFields: d.fields, listColumns: LIST_COLS, seoTitle: null, seoKeywords: null, seoDescription: null,
    portalPath: null,
    // 首页板块由固定版式渲染，不靠锚点定位
    anchor: isHome ? null : anchor, subheading: d.subheading ?? null, layout: isHome ? null : d.layout,
    heroEyebrow: null, heroTitle: null, heroDesc: null,
  }
}

/** 新增的一级与子级栏目行 */
export function buildV2Rows(): ChannelRow[] {
  return [...TOPS.map(topRow), ...CHILDREN.map(childRow)]
}

/**
 * 改版前的旧栏目（暖通空调 / 综合能源节能 / 智慧能源管理 / 智能家居）及其子栏目、头图栏目
 * 新版由「主营业务 / 核心产品」取代，种子不再生成；库里已有的随清理脚本删除
 */
const LEGACY_KEY = /^(?:(?:hvac|energy|smart|household)|banner-(?:hvac|energy|smart|household|s))(?:-|$)/
export const isLegacyKey = (key: string): boolean => LEGACY_KEY.test(key)

/** 对既有栏目的菜单与排序覆盖 */
export const V2_OVERRIDES: Record<string, Partial<ChannelRow>> = {
  // 后台侧边栏顺序：内容页（首页 → 业务 → 产品 → 方案 → 案例 → 联盟 → 关于 → 新闻）
  // 在前，运营类（Banner、会员）居中，系统类（基本信息、管理员、日志）靠后
  home: { sort: 10 },
  case: { sort: 50 },
  alliance: { sort: 60 },
  about: { sort: 70 },
  news: {
    sort: 71, menuParent: 'about', menuGroup: '了解中瑞恒', menuDesc: '中标喜报、公司大事、政策解读',
  },
  banner: { sort: 80 },
  'member-center': { sort: 81 },
  siteinfo: { sort: 90 },
  admin: { sort: 91 },
  'op-log': { sort: 92 },
}
