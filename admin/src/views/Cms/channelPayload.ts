// 栏目保存前的字段裁剪 —— 界面上没展示的字段一律不提交
// 提交默认空值会把库里已有的值清掉，所以按「当前栏目展示了哪些配置组」决定带哪些字段

/** 当前栏目展示了哪些配置组，由 ChannelManage 的同名 computed 给出 */
export interface ChannelFieldVisibility {
  seo: boolean
  hero: boolean
  homeSection: boolean
  block: boolean
  page: boolean
}

const SEO_FIELDS = ['seoTitle', 'seoKeywords', 'seoDescription'] as const
const HERO_FIELDS = ['heroEyebrow', 'heroTitle', 'heroDesc'] as const
const BLOCK_FIELDS = ['anchor', 'subheading', 'layout', 'menuGroup', 'menuDesc'] as const
const LOOK_FIELDS = ['blockTone', 'blockBg', 'blockColumns', 'headingAlign'] as const
const PAGE_FIELDS = ['portalPath', 'menuParent', 'externalUrl', 'heroBg', 'heroVideo'] as const

/**
 * 按可见配置组裁剪表单，返回待提交的副本（不改动原表单）
 * @param form 栏目编辑表单
 * @param v 各配置组是否可见
 */
export function pruneChannelPayload<T extends Record<string, unknown>>(
  form: T,
  v: ChannelFieldVisibility
): Partial<T> {
  const payload: Partial<T> = { ...form }
  const drop = (keys: readonly string[]) => keys.forEach(k => delete payload[k as keyof T])

  if (!v.seo) drop(SEO_FIELDS)
  if (!v.hero) drop(HERO_FIELDS)
  // 首页板块只保留 subheading（板块主标题），其余区块字段界面不展示
  if (v.homeSection) drop(BLOCK_FIELDS.filter(k => k !== 'subheading'))
  else if (!v.block) drop(BLOCK_FIELDS)
  if (!v.block || v.homeSection) drop(LOOK_FIELDS)
  else if (payload.blockTone !== 'image') {
    // 不用背景图时清掉残留地址，免得之后切回背景图时冒出一张旧图
    ;(payload as Record<string, unknown>).blockBg = ''
  }
  if (!v.page) drop(PAGE_FIELDS)
  else {
    // 挂靠清空要显式传空串，否则后端视为未修改
    ;(payload as Record<string, unknown>).menuParent = payload.menuParent ?? ''
  }
  return payload
}
