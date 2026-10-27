// 内容列表的拖拽排序 —— 从 ContentList 抽出，列表页只管展示与筛选
import { nextTick, onBeforeUnmount, type Ref } from 'vue'
import { message } from 'ant-design-vue'
import Sortable from 'sortablejs'
import { updateContentSort, type Content } from '@/api/cms'

/**
 * @param opts.channelKey 当前栏目 key
 * @param opts.rows 当前页数据（拖拽后就地改写顺序与 sort）
 * @param opts.tableWrap 表格外层容器，用来找 tbody
 * @param opts.reload 失败或需还原 DOM 时重取列表
 */
export function useContentDragSort(opts: {
  channelKey: () => string
  rows: Ref<Content[]>
  tableWrap: Ref<HTMLElement | undefined>
  reload: () => void
}) {
  const { rows, tableWrap, reload } = opts

  // 拖拽结束：以 DOM 的 data-row-key 顺序为准重排当前页，并把排序值降序回写
  // 用 key 定位而非位置索引，规避 a-table tbody 中的 measure-row 造成的索引错位
  const onDragReorder = async (tbody: HTMLElement) => {
    // 服务端分页后 rows 就是当前页，不再需要按页码切片
    const oldPageRows = [...rows.value]

    // 读取拖拽后真实数据行的 id 顺序（仅 tr[data-row-key]，排除测量行）
    const keyOrder = Array.from(tbody.querySelectorAll('tr[data-row-key]'))
      .map((tr) => Number((tr as HTMLElement).dataset.rowKey))
    const byId = new Map(oldPageRows.map((r) => [r.id, r]))
    const newPageRows = keyOrder.map((id) => byId.get(id)).filter(Boolean) as Content[]
    if (newPageRows.length !== oldPageRows.length) { reload(); return }

    // 顺序未变则不处理
    if (newPageRows.every((r, i) => r.id === oldPageRows[i].id)) return

    // 禁止跨置顶边界拖动（前置条件：服务端按 isTop 优先返回，置顶行聚集在页首 topCount 位）
    const topCount = oldPageRows.filter((r) => r.isTop).length
    const crossed = newPageRows.some((r, i) => r.isTop !== (i < topCount))
    if (crossed) {
      message.warning('置顶与非置顶内容不能互换位置')
      reload() // 重载以还原被拖动的 DOM
      return
    }

    // 把新顺序写回当前页数据
    rows.value = newPageRows

    // 取当前页排序值池，按降序重新分配给新顺序（保持数值池不变）
    const sortPool = newPageRows.map((r) => r.sort ?? 0).sort((a, b) => b - a)
    const changed: Content[] = []
    newPageRows.forEach((r, i) => {
      if (r.sort !== sortPool[i]) {
        r.sort = sortPool[i]
        changed.push(r)
      }
    })

    try {
      await Promise.all(
        changed.map((r) => updateContentSort(opts.channelKey(), r.id, r.sort ?? 0))
      )
      message.success('排序已更新')
    } catch {
      message.error('排序更新失败')
      reload()
    }
  }

  let sortable: Sortable | null = null
  /** 在表格 tbody 上初始化拖拽，仅排序手柄可触发；行集合变化后需重新调用 */
  const initSortable = async () => {
    await nextTick()
    sortable?.destroy()
    const tbody = tableWrap.value?.querySelector('.ant-table-tbody') as HTMLElement | null
    if (!tbody) return
    sortable = Sortable.create(tbody, {
      handle: '.sort-drag-handle',
      animation: 150,
      onEnd: () => onDragReorder(tbody)
    })
  }

  onBeforeUnmount(() => { sortable?.destroy() })

  return { initSortable }
}
