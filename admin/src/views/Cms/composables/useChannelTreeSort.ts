// 栏目树拖拽排序 —— 只允许同级排序，放下后按新顺序回写 sort
import type { Ref } from 'vue'
import { message } from 'ant-design-vue'
import type { AntTreeNodeDropEvent, AntTreeNodeMouseEvent } from 'ant-design-vue/es/tree'
import type { DataNode } from 'ant-design-vue/es/vc-tree/interface'
import type { AllowDropOptions } from 'ant-design-vue/es/vc-tree/props'
import { updateChannel, type Channel } from '@/api/cms'

/**
 * @param flat 扁平栏目列表（树的数据源）
 * @param onSorted 排序回写成功后的刷新（侧边栏等）
 * @param onFailed 回写失败后的重新拉取，纠正本地已改动的 sort
 */
export function useChannelTreeSort(
  flat: Ref<Channel[]>,
  onSorted: () => Promise<void>,
  onFailed: () => Promise<void>
) {
  let draggingParentId: number | null = null

  // 仅允许同级排序：拖到节点之间的间隙（非放入节点内部），且与拖动节点同父
  const allowTreeDrop = ({ dropNode, dropPosition }: AllowDropOptions<DataNode>) => {
    if (dropPosition === 0) return false // 0 = 放到节点内部，禁止改变层级
    const target = flat.value.find(c => c.id === dropNode.id)
    return !!target && target.parentId === draggingParentId
  }

  const onTreeDragStart = ({ node }: AntTreeNodeMouseEvent) => {
    const n = flat.value.find(c => c.id === node.id)
    draggingParentId = n ? n.parentId : null
  }

  // 拖拽结束（含取消）统一清空，避免残留值影响下一次 allowDrop 校验
  const onTreeDragEnd = () => { draggingParentId = null }

  /** 把拖动项插到目标位置，返回 sort 有变化的同级节点 */
  const reorder = (drag: Channel, drop: Channel, after: boolean): Channel[] => {
    const siblings = flat.value
      .filter(c => c.parentId === drag.parentId)
      .sort((a, b) => a.sort - b.sort)
    const fromIdx = siblings.findIndex(c => c.id === drag.id)
    if (fromIdx === -1) return []
    siblings.splice(fromIdx, 1)
    const dropIdx = siblings.findIndex(c => c.id === drop.id)
    if (dropIdx === -1) return [] // 目标已不在同级，放弃以防错位
    siblings.splice(after ? dropIdx + 1 : dropIdx, 0, drag)
    // 重新分配连续 sort，仅返回变化项
    const changed: Channel[] = []
    siblings.forEach((c, i) => {
      if (c.sort !== i + 1) {
        c.sort = i + 1
        changed.push(c)
      }
    })
    return changed
  }

  // 拖拽放下：在同一父级内按新顺序重排并回写 sort
  const onTreeDrop = async (info: AntTreeNodeDropEvent) => {
    try {
      const drag = flat.value.find(c => c.id === info.dragNode.id)
      const drop = flat.value.find(c => c.id === info.node.id)
      if (!drag || !drop || drag.parentId !== drop.parentId) return
      // 相对位置：>0 落在 drop 之后，<0 落在 drop 之前，0 放入内部（禁止）
      const dropPos = String(info.node.pos).split('-')
      const relative = info.dropPosition - Number(dropPos[dropPos.length - 1])
      if (relative === 0) return
      const changed = reorder(drag, drop, relative > 0)
      if (!changed.length) return
      try {
        await Promise.all(changed.map(c => updateChannel({ id: c.id, sort: c.sort })))
        message.success('排序已更新')
        await onSorted()
      } catch {
        message.error('排序更新失败')
        await onFailed()
      }
    } finally {
      draggingParentId = null
    }
  }

  return { allowTreeDrop, onTreeDragStart, onTreeDragEnd, onTreeDrop }
}
