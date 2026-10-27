// 列表页的页码与筛选 ↔ 地址栏查询串 —— 进编辑页再返回、刷新页面都停在原来那一页
// 每页条数另存 localStorage：运营调成 50 条后，下次进来不用再调
import { useRoute, useRouter } from 'vue-router'

/** 筛选值：只支持字符串或字符串二元组（日期区间） */
type FilterValue = string | [string, string] | undefined

const PAGE_SIZE_KEY = 'admin:list-page-size'
const PAGE_SIZE_OPTIONS = [10, 20, 50]

/** 读取已记忆的每页条数，非法值回落默认 */
function rememberedPageSize(scope: string, fallback: number): number {
  try {
    const all = JSON.parse(localStorage.getItem(PAGE_SIZE_KEY) || '{}') as Record<string, number>
    const v = all[scope]
    return PAGE_SIZE_OPTIONS.includes(v) ? v : fallback
  } catch {
    return fallback
  }
}

/**
 * @param scope 记忆每页条数的分组，一般用栏目 key
 */
export function useListQuery(scope: () => string) {
  const route = useRoute()
  const router = useRouter()

  /** 正整数查询参数 */
  const intOf = (name: string, fallback: number) => {
    const n = Number(route.query[name])
    return Number.isInteger(n) && n > 0 ? n : fallback
  }

  /** 字符串查询参数 */
  const strOf = (name: string): string | undefined => {
    const v = route.query[name]
    return typeof v === 'string' && v ? v : undefined
  }

  /** 日期区间：两个参数都在才算 */
  const rangeOf = (from: string, to: string): [string, string] | undefined => {
    const a = strOf(from)
    const b = strOf(to)
    return a && b ? [a, b] : undefined
  }

  /** 页码 */
  const initialPage = () => intOf('page', 1)

  /** 每页条数：地址栏优先，其次记忆值 */
  const initialPageSize = (fallback = 10) => {
    const fromQuery = intOf('pageSize', 0)
    return PAGE_SIZE_OPTIONS.includes(fromQuery) ? fromQuery : rememberedPageSize(scope(), fallback)
  }

  /** 记住每页条数 */
  const rememberPageSize = (size: number) => {
    try {
      const all = JSON.parse(localStorage.getItem(PAGE_SIZE_KEY) || '{}') as Record<string, number>
      all[scope()] = size
      localStorage.setItem(PAGE_SIZE_KEY, JSON.stringify(all))
    } catch {
      // 隐私模式等写不进去时只是不记忆，不影响使用
    }
  }

  /**
   * 把当前状态写回地址栏：replace 不新增历史记录，后退键仍回到上一个页面
   * 空值不写，地址保持干净
   */
  const sync = (state: { page: number; pageSize: number; filters: Record<string, FilterValue> }) => {
    const query: Record<string, string> = {}
    if (state.page > 1) query.page = String(state.page)
    if (state.pageSize !== 10) query.pageSize = String(state.pageSize)
    for (const [k, v] of Object.entries(state.filters)) {
      if (Array.isArray(v)) {
        query[`${k}From`] = v[0]
        query[`${k}To`] = v[1]
      } else if (v) {
        query[k] = v
      }
    }
    void router.replace({ path: route.path, query })
  }

  /** 当前列表地址（含查询串），进编辑页时带过去，返回时原样回来 */
  const currentFullPath = () => route.fullPath

  return { initialPage, initialPageSize, strOf, rangeOf, sync, rememberPageSize, currentFullPath }
}
