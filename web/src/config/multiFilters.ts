// 栏目页多标签组合筛选配置 —— 声明「哪个区块提供哪些筛选维度」，并登记九大行业常量
//
// 与 channelFilters.ts（单维分类筛选）的区别：这里的筛选走 extra 里的业务线 / 行业 / 标签，
// 维度之间同时满足、同一维度内任选其一。选项来源：业务线用 businessLines.ts，行业用下方常量，
// 标签从当前区块已加载条目的 extra.tags 去重得出（见 ChannelPage）。
import type { FilterDimension } from '@/composables/useMultiFilter'

/**
 * 九大行业，案例与解决方案共用
 * ⚠️ 须与后端 server/src/scripts/seed/channel-rows-v2.ts 的 INDUSTRIES 保持一致：
 * 筛选按取值精确匹配，名称不一致会导致选了行业却筛不到内容
 */
export const INDUSTRY_OPTIONS = [
  '医院', '高校', '政府机关', '商业园区', '交通', '洁净空间', '数据中心', '工业园区', '住宅',
] as const

/** 各维度在筛选条上的展示名 */
export const DIMENSION_LABEL: Record<FilterDimension, string> = {
  business: '业务线',
  industry: '行业',
  tag: '标签',
}

/** 单个区块的多维筛选规则 */
export interface MultiFilterRule {
  /** 被筛选的内容栏目 key（区块的 channelKey） */
  target: string
  /** 提供哪些筛选维度，按展示顺序 */
  dimensions: FilterDimension[]
}

/**
 * 各栏目页的多维筛选规则，键为一级栏目 key
 * 案例：业务线 + 行业 + 标签；产品：业务线 + 标签；方案：行业 + 标签
 */
export const MULTI_FILTERS: Record<string, MultiFilterRule[]> = {
  case: [{ target: 'case-featured', dimensions: ['business', 'industry', 'tag'] }],
  products: [{ target: 'products-list', dimensions: ['business', 'tag'] }],
  solutions: [{ target: 'solutions-list', dimensions: ['industry', 'tag'] }],
}

/**
 * 取某栏目页的多维筛选规则
 * @param pageKey 一级栏目 key
 */
export function multiFilterRulesOf(pageKey: string): MultiFilterRule[] {
  return MULTI_FILTERS[pageKey] ?? []
}
