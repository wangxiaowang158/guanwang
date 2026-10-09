// 多标签组合筛选 —— 业务线 / 行业 / 标签三个维度，维度内多选（OR）、维度间同时满足（AND）
//
// 选择状态落在地址里（与 useChannelPaging 同一思路）：刷新、后退、转发链接都能回到同一组合。
// 地址形如 /case?case-content.b=energy,building&case-content.i=医院&case-content.t=节能,改造
// 以区块锚点为前缀，同页多个区块互不干扰；筛选变化时页码归 1，由 useChannelPaging 监听地址变化后重取。
//
// 用法（页面组装阶段）：
//   const multi = useMultiFilter()
//   const paging = useChannelPaging(content, validCategories, multi.paramsOf)
//   <MultiFilterBar :dimensions="..." :selected="multi.selectedOf(block)" @toggle="multi.toggle(block, $event.dimension, $event.value)" @clear="multi.clear(block)" />
import { useRoute, useRouter } from 'vue-router'
import type { LocationQueryRaw } from 'vue-router'
import type { ExtraFilterParams, PageBlock } from '@/api/page'
import { BUSINESS_LINE_OPTIONS } from '@/config/businessLines'
import { pageKeyOf } from './useChannelPaging'

/** 筛选维度：对应 getBlockItems 的 business / industry / tag 参数 */
export type FilterDimension = 'business' | 'industry' | 'tag'

/** 各维度在地址里的键后缀 */
const DIM_SUFFIX: Record<FilterDimension, string> = { business: 'b', industry: 'i', tag: 't' }

/** 单个维度的取值上限，防止手写地址塞入超长列表拖慢接口 */
const MAX_PER_DIM = 20

const VALID_BUSINESS = new Set<string>(BUSINESS_LINE_OPTIONS.map(o => o.value))

const keyOf = (anchor: string, dim: FilterDimension) => `${anchor}.${DIM_SUFFIX[dim]}`

export function useMultiFilter() {
  const route = useRoute()
  const router = useRouter()

  /** 读地址里某区块某维度的已选值：逗号切分、去重、限量；业务线额外丢弃非法取值 */
  function valuesOf(anchor: string, dim: FilterDimension): string[] {
    const raw = route.query[keyOf(anchor, dim)]
    if (typeof raw !== 'string') return []
    const out: string[] = []
    for (const v of raw.split(',')) {
      const s = v.trim()
      if (!s || out.includes(s)) continue
      if (dim === 'business' && !VALID_BUSINESS.has(s)) continue
      out.push(s)
      if (out.length >= MAX_PER_DIM) break
    }
    return out
  }

  /**
   * 某区块当前的筛选选择，可直接作为 MultiFilterBar 的 selected
   * @param block 目标区块
   */
  function selectedOf(block: PageBlock): Record<FilterDimension, string[]> {
    return {
      business: valuesOf(block.anchor, 'business'),
      industry: valuesOf(block.anchor, 'industry'),
      tag: valuesOf(block.anchor, 'tag'),
    }
  }

  /**
   * 把某区块的选择映射为 getBlockItems 的筛选参数；传给 useChannelPaging 的第三个参数
   * @param block 目标区块
   */
  function paramsOf(block: PageBlock): ExtraFilterParams {
    const s = selectedOf(block)
    return { business: s.business, industry: s.industry, tag: s.tag }
  }

  /** 某区块是否已有任何筛选选择 */
  function hasSelection(block: PageBlock): boolean {
    const s = selectedOf(block)
    return s.business.length + s.industry.length + s.tag.length > 0
  }

  /** 写回地址；同一次导航里页码归 1。push 让后退能回到上一组合 */
  async function commit(block: PageBlock, next: Record<FilterDimension, string[]>): Promise<void> {
    const query: LocationQueryRaw = { ...route.query }
    for (const dim of Object.keys(DIM_SUFFIX) as FilterDimension[]) {
      const k = keyOf(block.anchor, dim)
      if (next[dim].length) query[k] = next[dim].join(',')
      else delete query[k]
    }
    delete query[pageKeyOf(block.anchor)]
    await router.push({ query, hash: `#${block.anchor}` })
  }

  /**
   * 切换某维度的一个取值（已选则取消，未选则加入）
   * 含逗号的取值无法在逗号分隔的地址与接口里表达，直接忽略
   */
  async function toggle(block: PageBlock, dim: FilterDimension, value: string): Promise<void> {
    if (!value || value.includes(',')) return
    const cur = selectedOf(block)
    const list = cur[dim]
    cur[dim] = list.includes(value) ? list.filter(v => v !== value) : [...list, value].slice(0, MAX_PER_DIM)
    await commit(block, cur)
  }

  /** 清空某区块全部维度的选择 */
  async function clear(block: PageBlock): Promise<void> {
    if (!hasSelection(block)) return
    await commit(block, { business: [], industry: [], tag: [] })
  }

  return { selectedOf, paramsOf, hasSelection, toggle, clear }
}
