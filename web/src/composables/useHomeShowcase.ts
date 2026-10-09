// 新版首页的两块数据装配：三大业务简介、标杆案例看板
//
// 首页聚合接口（/api/portal/home/sections）暂未下发这两块所需的字段，
// 故复用已有的栏目页区块接口取数，不新增后端接口：
//   - 三大业务：名称与痛点标题取自导航菜单子项，解决方案简述与核心收益取自各业务页「客户共性痛点」首条
//   - 标杆案例：取自案例页 case-featured 区块
// 任何一项缺字段，对应行不显示；整块无数据则不渲染（不占位）
import { computed, onMounted, ref } from 'vue'
import { getBlockItems } from '@/api/page'
import type { ExtraMetric, PageItem } from '@/api/page'
import { API_SUCCESS_CODE } from '@/config'
import { useSiteStore } from '@/stores/site'

/** 三大业务卡片 */
export interface BusinessBrief {
  key: string
  /** 业务名称，如「智慧能源」 */
  name: string
  /** 痛点标题 */
  pain: string
  /** 解决方案简述 */
  solution: string
  /** 核心收益 */
  value: string
  /** 详情页路径 */
  path: string
}

/** 三大业务的固定定义：路径与痛点区块的栏目 key 来自后端新增栏目 */
const BUSINESS_DEFS = [
  { key: 'business-energy', path: '/business/energy' },
  { key: 'business-building', path: '/business/building' },
  { key: 'business-living', path: '/business/living' },
]

/** 看板最多展示几项指标 */
const MAX_BOARD_METRICS = 4
/** 横向滚动最多展示几个案例 */
const MAX_CASES = 8
/** 取案例时的单次条数：略多于展示数，便于从中挑出有指标的 */
const CASE_FETCH_SIZE = 12

/** 取某栏目区块首页条目，失败返回空数组（首页模块缺数据时静默不渲染） */
async function fetchItems(channelKey: string, pageSize: number): Promise<PageItem[]> {
  try {
    const res = await getBlockItems(channelKey, 1, pageSize)
    return res.code === API_SUCCESS_CODE && res.data ? res.data.items : []
  } catch {
    return []
  }
}

/** 三大业务简介 */
export function useBusinessBriefs() {
  const siteStore = useSiteStore()
  const pains = ref<Record<string, PageItem | undefined>>({})

  // 菜单可能晚于首屏到达，用 computed 跟随；子项缺失时只剩固定路径，名称为空的卡片不展示
  const briefs = computed<BusinessBrief[]>(() => {
    const parent = siteStore.menu.find(m => m.key === 'business')
    return BUSINESS_DEFS.map((def) => {
      const node = parent?.children?.find(c => c.key === def.key)
      const firstPain = pains.value[def.key]?.extra?.pains?.[0]
      return {
        key: def.key,
        name: node?.label ?? '',
        pain: node?.desc ?? firstPain?.title ?? '',
        solution: firstPain?.solution ?? '',
        value: firstPain?.value ?? '',
        path: def.path,
      }
    }).filter(b => b.name)
  })

  onMounted(async () => {
    void siteStore.fetchMenu()
    const entries = await Promise.all(BUSINESS_DEFS.map(async def => {
      const items = await fetchItems(`${def.key}-pains`, 1)
      return [def.key, items[0]] as const
    }))
    pains.value = Object.fromEntries(entries)
  })

  return { briefs }
}

/** 标杆案例：看板指标 + 横向滚动案例卡片 */
export function useCaseShowcase() {
  const cases = ref<PageItem[]>([])

  // 看板指标：每个案例取首项指标，注明来源项目，避免把不同项目的数字混成「总量」
  const metrics = computed<ExtraMetric[]>(() => {
    const out: ExtraMetric[] = []
    for (const c of cases.value) {
      const m = c.extra?.metrics?.[0]
      if (m) out.push({ ...m, note: m.note || c.title })
      if (out.length >= MAX_BOARD_METRICS) break
    }
    return out
  })

  onMounted(async () => {
    cases.value = (await fetchItems('case-featured', CASE_FETCH_SIZE)).slice(0, MAX_CASES)
  })

  return { cases, metrics }
}
