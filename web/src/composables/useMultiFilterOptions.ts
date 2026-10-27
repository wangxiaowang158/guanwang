// 栏目页多标签筛选的候选项 —— 从 ChannelPage 抽出：业务线/行业取固定选项，标签从条目汇总
import { ref, type ComputedRef } from 'vue'
import { getBlockItems } from '@/api/page'
import type { PageBlock, PageContent } from '@/api/page'
import { API_SUCCESS_CODE } from '@/config'
import { DIMENSION_LABEL, INDUSTRY_OPTIONS } from '@/config/multiFilters'
import type { MultiFilterRule } from '@/config/multiFilters'
import { BUSINESS_LINE_OPTIONS } from '@/config/businessLines'
import type { FilterDimension } from '@/composables/useMultiFilter'
import type { FilterDimensionDef } from '@/components/sections/MultiFilterBar.vue'

/** 标签是运营维护的少量枚举，一次取到后端单页上限即足够 */
const OPTION_FETCH_SIZE = 100

/** 从条目 extra 汇总去重后的标签，保持首次出现的顺序 */
function collectTags(items: PageBlock['items']): string[] {
  const out: string[] = []
  for (const it of items) {
    for (const t of it.extra?.tags ?? []) if (t && !t.includes(',') && !out.includes(t)) out.push(t)
  }
  return out
}

/**
 * @param rules 当前栏目的多标签筛选规则
 * @param ruleOf 区块 → 其筛选规则
 * @param selectedOf 区块 → 地址里已选的取值
 */
export function useMultiFilterOptions(
  rules: ComputedRef<MultiFilterRule[]>,
  ruleOf: (block: PageBlock) => MultiFilterRule | undefined,
  selectedOf: (block: PageBlock) => Record<FilterDimension, string[]>,
) {
  /** 标签选项，按区块锚点归档：取未筛选时的全量条目去重，筛选后不随结果收缩 */
  const tagOptions = ref<Record<string, string[]>>({})

  /** 取某维度的候选值 */
  function optionValuesOf(block: PageBlock, dim: FilterDimension): string[] {
    if (dim === 'business') return BUSINESS_LINE_OPTIONS.map(o => o.value)
    if (dim === 'industry') return [...INDUSTRY_OPTIONS]
    return tagOptions.value[block.anchor] ?? []
  }

  /**
   * 某区块的筛选维度定义
   * 地址里已选、但不在候选里的取值（如标签被下线）也并入，保证它仍可被看到并取消
   */
  function dimensionsOf(block: PageBlock): FilterDimensionDef[] {
    const rule = ruleOf(block)
    if (!rule) return []
    const selected = selectedOf(block)
    return rule.dimensions.map((dim) => {
      const labelOf = (v: string) => BUSINESS_LINE_OPTIONS.find(o => o.value === v && dim === 'business')?.label ?? v
      const base = optionValuesOf(block, dim)
      const values = [...base, ...selected[dim].filter(v => !base.includes(v))]
      return { key: dim, label: DIMENSION_LABEL[dim], options: values.map(v => ({ label: labelOf(v), value: v })) }
    })
  }

  /** 取需要「标签」维度的区块的全量条目并汇总标签；首屏已含全部条目时直接用，取不到沿用首屏那一页 */
  async function loadTagOptions(page: PageContent): Promise<void> {
    const result: Record<string, string[]> = {}
    await Promise.all(rules.value.filter(r => r.dimensions.includes('tag')).map(async (rule) => {
      const block = page.blocks.find(b => b.channelKey === rule.target)
      if (!block) return
      let items = block.items
      if (block.total > block.items.length) {
        try {
          const res = await getBlockItems(rule.target, 1, OPTION_FETCH_SIZE)
          if (res.code === API_SUCCESS_CODE && res.data) items = res.data.items
        } catch {
          // 取不到就沿用首屏那一页：选项不全好过筛选条整个消失
        }
      }
      result[block.anchor] = collectTags(items)
    }))
    tagOptions.value = result
  }

  /** 切换栏目时清空 */
  const resetTagOptions = () => { tagOptions.value = {} }

  return { dimensionsOf, loadTagOptions, resetTagOptions }
}
