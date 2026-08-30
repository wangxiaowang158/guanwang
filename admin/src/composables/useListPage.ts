// 列表页 composable —— 收敛 loading/数据/关键词/分页/多选 与「加载 + 失败提示」样板
// 只覆盖列表页共性；表单弹窗、树形结构等页面独有逻辑仍留在各页面内
import { ref, shallowRef, computed, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { DEFAULT_PAGE_SIZE, LIST_LOAD_FAILED } from '@/constants/ui'

/** admin 侧接口统一返回 axios 响应，成功码为 200 */
interface AxiosLikeResult<T> {
  data: { code: number; message?: string; data: T }
}

/** 取数时传给 fetcher 的查询参数（由 composable 持有，避免调用方闭包自引用） */
export interface ListQuery {
  /** 当前关键词，空串表示未筛选 */
  keyword: string
}

/** useListPage 配置项 */
export interface UseListPageOptions {
  /** 加载失败时的提示文案，默认「数据加载失败，请刷新重试」 */
  errorText?: string
  /** 是否在 onMounted 时自动加载，默认 true */
  immediate?: boolean
  /** 前端分页每页条数；传 0 表示不分页 */
  pageSize?: number
}

/**
 * 列表页数据管理
 * @param fetcher 取数函数；关键词由参数传入，不要在闭包里引用本函数返回的 keyword
 *                （那会形成自引用，导致 TS 无法推导类型）
 * @param options 行为配置
 */
export function useListPage<T>(
  fetcher: (query: ListQuery) => Promise<AxiosLikeResult<T[]>>,
  options: UseListPageOptions = {}
) {
  const {
    errorText = LIST_LOAD_FAILED,
    immediate = true,
    pageSize: initialPageSize = DEFAULT_PAGE_SIZE,
  } = options

  const loading = ref(false)
  // 列表整体替换，无需深响应；同时避开泛型下 ref 的 unwrap 类型问题
  const rows = shallowRef<T[]>([])
  const keyword = ref('')
  const selectedKeys = ref<number[]>([])

  const page = ref(1)
  const pageSize = ref(initialPageSize)
  const total = computed(() => rows.value.length)

  /** 当前页数据；pageSize 为 0 时返回全量 */
  const pagedData = computed(() => {
    if (!pageSize.value) return rows.value
    const start = (page.value - 1) * pageSize.value
    return rows.value.slice(start, start + pageSize.value)
  })

  /** 加载列表；失败提示后保持原数据不变，多选态一并清空 */
  async function fetchList() {
    loading.value = true
    try {
      const res = await fetcher({ keyword: keyword.value })
      if (res.data.code === 200) {
        rows.value = res.data.data
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

  /** 表格多选变更回调 */
  function onSelectChange(keys: (string | number)[]) {
    selectedKeys.value = keys as number[]
  }

  /** 关键词/筛选变化后重新查询，回到第一页 */
  function search() {
    page.value = 1
    return fetchList()
  }

  if (immediate) onMounted(fetchList)

  return {
    loading, rows, keyword, selectedKeys,
    page, pageSize, total, pagedData,
    fetchList, search, onSelectChange,
  }
}
