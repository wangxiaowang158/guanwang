// 栏目页分类筛选配置 —— 声明「哪个分类栏目筛哪个内容栏目」
//
// 为什么放前台配置而不放后端字段：这层关系是页面呈现语义（某个区块充当另一个区块的筛选器），
// 不是内容数据本身的属性。放后端要给 channel 表加列并让运营去配，
// 而运营配错就会出现「筛选器筛不到任何内容」的静默失效。
// 放这里的代价是新增筛选维度需改代码，收益是关系由类型系统保证、不会配错。
//
// 匹配口径：分类栏目条目的 title 与内容栏目条目的 category 字段精确相等。
// 故后台录入内容时「产品类别」必须与分类栏目里的名称逐字一致，
// 这也是把该字段从自由文本改成下拉的原因（见 admin/src/views/Cms/fieldDefs.ts）

/** 单条筛选关系 */
export interface ChannelFilterRule {
  /** 提供筛选项的分类栏目 key，该区块不再独立渲染成内容块 */
  source: string
  /** 被筛选的内容栏目 key */
  target: string
}

/**
 * 各栏目页的筛选关系，键为一级栏目 key
 * 一个页面可有多条规则，但同一个 target 只应被一条规则筛选
 */
// ⚠️ 本表须与 admin/src/views/Cms/categorySources.ts 的 CATEGORY_SOURCES 保持一致：
// 这边声明「分类栏目筛哪个内容栏目」，那边声明「内容栏目的类别下拉从哪个分类栏目取」，
// 是同一层关系的两个方向。改动一侧务必同步另一侧，否则筛选会静默失效。
export const CHANNEL_FILTERS: Record<string, ChannelFilterRule[]> = {
  // 项目案例：按行业筛案例内容。能源采购方最常见的诉求是
  // 「看看你们在同类单位做过什么」，行业维度因此比类别维度更靠前
  case: [{ source: 'case-industry', target: 'case-content' }],
  // 暖通空调产品：按产品类别筛具体产品
  hvac: [{ source: 'hvac-category', target: 'hvac-product' }],
}

/**
 * 取某栏目页的筛选规则
 * @param pageKey 一级栏目 key
 */
export function filterRulesOf(pageKey: string): ChannelFilterRule[] {
  return CHANNEL_FILTERS[pageKey] ?? []
}
