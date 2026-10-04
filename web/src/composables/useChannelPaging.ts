// 栏目页区块的分页与分类筛选 —— 状态落在页面地址里（SRS 3.5.1 内容分页 / 内容筛选）
//
// 为什么放地址而不是组件状态：从详情页返回、刷新、把链接发给别人，
// 都应回到同一页同一分类；原先的「加载更多」离开页面就丢了进度。
// 地址形如 /news?company.p=2&case.c=医院 —— 以区块锚点为前缀，同页多个可分页区块互不干扰
import { reactive, watch } from 'vue'
import type { Ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { LocationQuery, LocationQueryRaw } from 'vue-router'
import { getBlockItems } from '@/api/page'
import type { PageBlock, PageContent } from '@/api/page'
import { API_SUCCESS_CODE } from '@/config'

/** 分页的展示形态：图文条目、条目列表。名称集合、序号步骤、富文本、视频一次性展示 */
const PAGED_LAYOUTS = new Set<PageBlock['layout']>(['cards', 'list'])

/** 条目数少于该值时不提供筛选（SRS 3.5.1） */
export const FILTER_MIN_ITEMS = 12

/** 一次性展示的区块取全量时的单页上限，与后端 PORTAL_MAX_PAGE_SIZE 一致 */
const FULL_FETCH_SIZE = 100

/** 区块运行时状态 */
interface BlockState {
  page: number
  category: string
  loading: boolean
  failed: boolean
  /** 不带筛选时的条目总数：决定是否提供筛选，不随筛选结果变化 */
  baseTotal: number
}

const pageKeyOf = (anchor: string) => `${anchor}.p`
const catKeyOf = (anchor: string) => `${anchor}.c`

/** 读地址里的页码，非正整数一律按第 1 页（SRS：页码超出范围或无效展示第 1 页） */
function readPage(query: LocationQuery, anchor: string): number {
  const n = Number(query[pageKeyOf(anchor)])
  return Number.isInteger(n) && n > 0 ? n : 1
}

function readCategory(query: LocationQuery, anchor: string): string {
  const v = query[catKeyOf(anchor)]
  return typeof v === 'string' ? v : ''
}

export function isPagedBlock(block: PageBlock): boolean {
  return PAGED_LAYOUTS.has(block.layout)
}

export function totalPages(block: PageBlock): number {
  return Math.max(1, Math.ceil(block.total / block.pageSize))
}

/**
 * @param content 栏目页内容（区块条目会被就地替换）
 * @param validCategories 取某区块当前可选的分类名，用于丢弃地址里已失效的分类
 */
export function useChannelPaging(
  content: Ref<PageContent | null>,
  validCategories: (block: PageBlock) => string[],
) {
  const route = useRoute()
  const router = useRouter()
  const state = reactive<Record<string, BlockState>>({})

  const stateOf = (block: PageBlock): BlockState => {
    if (!state[block.anchor]) {
      state[block.anchor] = { page: 1, category: '', loading: false, failed: false, baseTotal: block.total }
    }
    return state[block.anchor]
  }

  /** 该区块是否提供筛选：有分类可选且未筛选时的条目数达到门槛 */
  const filterEnabled = (block: PageBlock) =>
    validCategories(block).length > 0 && stateOf(block).baseTotal >= FILTER_MIN_ITEMS

  /**
   * 按地址同步某区块：页码或分类与当前已加载的不一致才请求
   * 请求失败时保留已展示的条目并标记失败（SRS：翻页或筛选加载失败保留当前条目）
   */
  async function sync(block: PageBlock): Promise<void> {
    const s = stateOf(block)
    const wantCat = filterEnabled(block) && validCategories(block).includes(readCategory(route.query, block.anchor))
      ? readCategory(route.query, block.anchor)
      : ''
    const wantPage = isPagedBlock(block) ? readPage(route.query, block.anchor) : 1
    if (wantPage === s.page && wantCat === s.category) return

    s.loading = true
    s.failed = false
    try {
      const res = await getBlockItems(block.channelKey, wantPage, block.pageSize, wantCat || undefined)
      if (res.code !== API_SUCCESS_CODE || !res.data) throw new Error(res.message)
      // 页码超过总页数：回到第 1 页，并把地址里的页码清掉
      if (!res.data.items.length && wantPage > 1) {
        s.loading = false
        void setQuery(block, { page: 1 })
        return
      }
      block.items = res.data.items
      block.total = res.data.total
      s.page = wantPage
      s.category = wantCat
    } catch {
      s.failed = true
    } finally {
      s.loading = false
    }
  }

  /**
   * 一次性展示的区块：首屏只下发了一页，超出部分补取全量
   * 名称集合、序号步骤等形态不分页，不补取的话第 13 条以后永远看不到
   */
  async function ensureFull(block: PageBlock): Promise<void> {
    if (isPagedBlock(block) || block.total <= block.items.length) return
    try {
      const res = await getBlockItems(block.channelKey, 1, FULL_FETCH_SIZE)
      if (res.code === API_SUCCESS_CODE && res.data) block.items = res.data.items
    } catch {
      // 取不到就保留首屏那一页，不打断浏览
    }
  }

  /**
   * 改地址里某区块的页码/分类；同一次导航里切分类会把页码归 1
   * @param block 目标区块
   * @param patch page 与 category 可只传其一
   */
  async function setQuery(block: PageBlock, patch: { page?: number; category?: string }): Promise<void> {
    const query: LocationQueryRaw = { ...route.query }
    const pKey = pageKeyOf(block.anchor)
    const cKey = catKeyOf(block.anchor)
    if (patch.category !== undefined) {
      if (patch.category) query[cKey] = patch.category
      else delete query[cKey]
      delete query[pKey]
    }
    if (patch.page !== undefined) {
      if (patch.page > 1) query[pKey] = String(patch.page)
      else delete query[pKey]
    }
    // 地址不变（上次加载失败后原地重试）时路由不会触发变化，直接重取
    if (sameQuery(query, route.query)) {
      stateOf(block).page = 0
      await sync(block)
      return
    }
    // push 而非 replace：浏览器后退能回到上一页码，符合访客对「翻页」的预期
    await router.push({ query, hash: `#${block.anchor}` })
  }

  /** 比较两份查询串是否等价（忽略键顺序） */
  function sameQuery(a: LocationQueryRaw, b: LocationQuery): boolean {
    const ka = Object.keys(a)
    const kb = Object.keys(b)
    return ka.length === kb.length && ka.every(k => String(a[k]) === String(b[k]))
  }

  function syncAll(): void {
    content.value?.blocks.forEach((b) => {
      stateOf(b)
      void sync(b)
      void ensureFull(b)
    })
  }

  watch(() => route.query, syncAll)

  /** 换栏目时清空状态，否则新栏目会沿用上一个栏目的页码与分类 */
  function reset(): void {
    Object.keys(state).forEach((k) => delete state[k])
  }

  return { state: stateOf, filterEnabled, setQuery, syncAll, reset }
}
