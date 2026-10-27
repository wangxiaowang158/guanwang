// 未保存离开拦截 —— 编辑页记下「已保存」快照，与当前表单比对得出是否有改动
// 有改动时：站内跳转（侧边栏、返回按钮）弹确认；关标签页/刷新走浏览器原生提示
import { onBeforeUnmount, onMounted } from 'vue'
import { onBeforeRouteLeave, onBeforeRouteUpdate } from 'vue-router'
import { Modal } from 'ant-design-vue'

/**
 * @param snapshot 返回当前表单可比对的值（只含会提交的字段）；返回 null 表示尚未加载完，不拦截
 * @returns markSaved：加载完成或保存成功后调用，把当前值记为基准
 */
export function useUnsavedGuard(snapshot: () => unknown) {
  /** 基准值的序列化结果；null 表示还没建立基准 */
  let saved: string | null = null

  const serialize = () => {
    const v = snapshot()
    return v === null ? null : JSON.stringify(v)
  }

  /** 把当前值记为「已保存」 */
  const markSaved = () => { saved = serialize() }

  /** 是否有未保存的改动 */
  const isDirty = () => {
    if (saved === null) return false
    const now = serialize()
    return now !== null && now !== saved
  }

  const confirmLeave = () => {
    if (!isDirty()) return true
    return new Promise<boolean>((resolve) => {
      Modal.confirm({
        title: '内容尚未保存，确定离开吗？',
        content: '离开后本次修改将丢失。',
        okText: '离开',
        okType: 'danger',
        cancelText: '继续编辑',
        onOk: () => resolve(true),
        onCancel: () => resolve(false),
      })
    })
  }

  onBeforeRouteLeave(confirmLeave)
  // 同一路由组件复用（如 /cms/:channelKey 从一个单页栏目切到另一个）不算离开，
  // 但编辑器会按 key 重建、丢掉改动，同样要拦；只改查询串（翻页、筛选）不拦
  onBeforeRouteUpdate((to, from) => (to.path === from.path ? true : confirmLeave()))

  // 关标签页、刷新、地址栏跳走：浏览器只允许显示它自己的通用提示
  const onBeforeUnload = (e: BeforeUnloadEvent) => {
    if (!isDirty()) return
    e.preventDefault()
    e.returnValue = ''
  }
  onMounted(() => window.addEventListener('beforeunload', onBeforeUnload))
  onBeforeUnmount(() => window.removeEventListener('beforeunload', onBeforeUnload))

  return { markSaved, isDirty }
}
