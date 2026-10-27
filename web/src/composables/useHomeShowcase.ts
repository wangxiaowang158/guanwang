// 首页取自其他页面的板块：三大业务简介、项目案例、新闻资讯
//
// 这些板块的内容本就维护在对应页面里，首页复用栏目页区块接口取数，不另建栏目、不新增后端接口：
//   - 三大业务：名称取自导航菜单子项，说明与配图取自各业务页「解决方案」区块首条
//   - 项目案例：取自项目案例页的标杆案例区块，没有标杆案例时取案例展示最新几条
//   - 新闻资讯：取自新闻资讯页的公司新闻、行业政策两个区块
// 任何一项缺字段，对应行不显示；整块无数据则不渲染（不占位）
import { computed, onMounted, ref } from 'vue'
import { getBlockItems } from '@/api/page'
import type { PageItem } from '@/api/page'
import { API_SUCCESS_CODE } from '@/config'
import { useSiteStore } from '@/stores/site'

/** 三大业务卡片 */
export interface BusinessBrief {
  key: string
  /** 业务名称，如「智慧能源」 */
  name: string
  /** 主张，如「中瑞恒能源智能体」 */
  title: string
  /** 一句话说明 */
  desc: string
  /** 配图（业务页解决方案区块首条的图） */
  image: string
  /** 配视频（同上取自解决方案首条），有则静音循环播放 */
  video?: string
  /** 详情页路径 */
  path: string
  /** 场景直达：业务页核心产品区块前几条的名称，点了跳到业务页产品区块 */
  scenes: string[]
}

/** 业务卡片下最多列几个场景直达 */
const BRIEF_SCENE_COUNT = 3

/** 三大业务的固定定义：路径与痛点区块的栏目 key 来自后端新增栏目 */
const BUSINESS_DEFS = [
  { key: 'business-energy', path: '/business/energy' },
  { key: 'business-building', path: '/business/building' },
  { key: 'business-living', path: '/business/living' },
]

/** 取某栏目区块首页条目，失败返回空数组（首页模块缺数据时静默不渲染） */
async function fetchItems(channelKey: string, pageSize: number): Promise<PageItem[]> {
  try {
    const res = await getBlockItems(channelKey, 1, pageSize)
    return res.code === API_SUCCESS_CODE && res.data ? res.data.items : []
  } catch {
    return []
  }
}

/**
 * 三大业务简介（框架图第三版：能源智能体 / 建筑生命体 / 未来人居）
 * 名称取自导航菜单「主营业务」的子项；一句话说明与配图取自各业务页「解决方案」区块的首条
 */
export function useBusinessBriefs() {
  const siteStore = useSiteStore()
  const solutions = ref<Record<string, PageItem | undefined>>({})
  const products = ref<Record<string, string[]>>({})

  // 菜单可能晚于首屏到达，用 computed 跟随；子项缺失（业务页被隐藏）时该卡片不展示
  const briefs = computed<BusinessBrief[]>(() => {
    const parent = siteStore.menu.find(m => m.key === 'business')
    return BUSINESS_DEFS.map((def) => {
      const node = parent?.children?.find(c => c.key === def.key)
      const first = solutions.value[def.key]
      return {
        key: def.key,
        name: node?.label ?? '',
        title: first?.title ?? '',
        desc: first?.desc ?? node?.desc ?? '',
        image: first?.image ?? '',
        video: first?.video,
        path: def.path,
        scenes: products.value[def.key] ?? [],
      }
    }).filter(b => b.name)
  })

  onMounted(async () => {
    void siteStore.fetchMenu()
    const entries = await Promise.all(BUSINESS_DEFS.map(async def => {
      const items = await fetchItems(`${def.key}-solution`, 1)
      return [def.key, items[0]] as const
    }))
    solutions.value = Object.fromEntries(entries)
  })
  // 场景直达单独取，慢了或失败不拖住业务卡片本身
  onMounted(async () => {
    const entries = await Promise.all(BUSINESS_DEFS.map(async def => {
      const items = await fetchItems(`${def.key}-products`, BRIEF_SCENE_COUNT)
      return [def.key, items.map(it => it.title).filter(Boolean)] as const
    }))
    products.value = Object.fromEntries(entries)
  })

  return { briefs }
}

/** 首页案例条数：三列一行 */
const HOME_CASE_COUNT = 3

/**
 * 首页项目案例：优先取运营挑出来的标杆案例，没有再取案例展示最新几条
 * 案例的节能率、合作模式等量化信息在条目 extra 里，卡片缺省时只显示标题与摘要
 */
export function useHomeCases() {
  const cases = ref<PageItem[]>([])
  onMounted(async () => {
    const featured = await fetchItems('case-featured', HOME_CASE_COUNT)
    cases.value = featured.length ? featured : await fetchItems('case-content', HOME_CASE_COUNT)
  })
  return { cases }
}

/** 首页新闻条数（框架图三列） */
const HOME_NEWS_COUNT = 3

/** 新闻资讯页的两个列表区块 */
const NEWS_CHANNELS = ['news-company', 'news-policy']

/**
 * 首页新闻资讯：两个新闻栏目各取最新几条，按发布日期合并取前三
 * 无日期的条目排在有日期的之后；整块无数据则不渲染
 */
export function useHomeNews() {
  const news = ref<PageItem[]>([])
  onMounted(async () => {
    const lists = await Promise.all(NEWS_CHANNELS.map(key => fetchItems(key, HOME_NEWS_COUNT)))
    news.value = lists.flat()
      .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
      .slice(0, HOME_NEWS_COUNT)
  })
  return { news }
}
