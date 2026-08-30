// 服务端分页列表 composable —— 供走真实后端的会员/反馈/日志页面使用
// 与 useListPage 的区别：分页由后端完成，接口返回 { list, total, page, pageSize }
import { ref, shallowRef, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { DEFAULT_PAGE_SIZE, LIST_LOAD_FAILED } from '@/constants/ui'

/** admin 侧接口统一返回 axios 响应，成功码为 200 */
interface AxiosLikeResult<T> {
  data: { code: number; message?: string; data: T }
}

/** 后端分页结果 */
interface PageData<T> {
  list: T[]
  total: number
}

/** 取数时传给 fetcher 的分页参数 */
export interface ServerListQuery {
  page: number
  pageSize: number
}

/** useServerListPage 配置项 */
export interface UseServerListPageOptions {
  /** 加载失败时的提示文案 */
  errorText?: string
  /** 是否在 onMounted 时自动加载，默认 true */
  immediate?: boolean
  /** 每页条数，默认取 DEFAULT_PAGE_SIZE */
  pageSize?: number
}

/**
 * 服务端分页列表数据管理
 * @param fetcher 取数函数；分页参数由本 composable 传入，页面自身的筛选条件用闭包引用
 * @param options 行为配置
 */
export function useServerListPage<T>(
  fetcher: (query: ServerListQuery) => Promise<AxiosLikeResult<PageData<T>>>,
  options: UseServerListPageOptions = {},
) {
  const {
    errorText = LIST_LOAD_FAILED,
    immediate = true,
    pageSize: initialPageSize = DEFAULT_PAGE_SIZE,
  } = options

  const loading = ref(false)
  // 列表整体替换，无需深响应
  const rows = shallowRef<T[]>([])
  const selectedKeys = ref<number[]>([])
  const page = ref(1)
  const pageSize = ref(initialPageSize)
  const total = ref(0)

  /** 加载当前页；失败提示后保持原数据不变，多选态一并清空 */
  async function fetchList() {
    loading.value = true
    try {
      const res = await fetcher({ page: page.value, pageSize: pageSize.value })
      if (res.data.code === 200) {
        rows.value = res.data.data.list
        total.value = res.data.data.total
        selectedKeys.value = []
      } else {
        message.error(res.data.message || errorText)
      }
    } catch {
      message.error(errorText)
    } finally {
      loading.value = false
    }
  }

  /** 筛选条件变化后重新查询，回到第一页 */
  function search() {
    page.value = 1
    return fetchList()
  }

  /** 表格分页变更回调 */
  function onPageChange(nextPage: number, nextPageSize: number) {
    page.value = nextPage
    pageSize.value = nextPageSize
    return fetchList()
  }

  /** 表格多选变更回调 */
  function onSelectChange(keys: (string | number)[]) {
    selectedKeys.value = keys as number[]
  }

  /**
   * 删除后刷新：若当前页已被删空且不是第一页，则回退一页，避免停在空白页
   * @param removedCount 本次删除的条数
   */
  function refreshAfterRemove(removedCount: number) {
    const rest = rows.value.length - removedCount
    if (rest <= 0 && page.value > 1) page.value -= 1
    return fetchList()
  }

  if (immediate) onMounted(fetchList)

  return {
    loading, rows, selectedKeys, page, pageSize, total,
    fetchList, search, onPageChange, onSelectChange, refreshAfterRemove,
  }
}
