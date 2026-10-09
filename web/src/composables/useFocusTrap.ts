// 弹窗焦点管理 —— 打开时把焦点移入、Tab 在弹窗内循环、Esc 关闭、关闭后焦点还给触发元素，并锁定页面滚动
import { nextTick, onBeforeUnmount, watch } from 'vue'
import type { Ref } from 'vue'

/** 可聚焦元素选择器 */
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * @param active 弹窗是否打开
 * @param container 弹窗容器（需 tabindex="-1" 以便无可聚焦子元素时兜底接收焦点）
 * @param onClose Esc 触发的关闭回调
 * @param initialFocus 打开时优先聚焦的元素选择器，缺省聚焦第一个可聚焦元素
 */
export function useFocusTrap(
  active: Ref<boolean>,
  container: Ref<HTMLElement | undefined>,
  onClose: () => void,
  initialFocus?: string,
) {
  let opener: HTMLElement | null = null
  let prevOverflow = ''

  const focusables = (): HTMLElement[] =>
    Array.from(container.value?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])
      .filter(el => !el.hasAttribute('inert') && el.offsetParent !== null)

  function onKeydown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      e.stopPropagation()
      onClose()
      return
    }
    if (e.key !== 'Tab') return
    const list = focusables()
    if (!list.length) {
      e.preventDefault()
      container.value?.focus()
      return
    }
    const first = list[0]
    const last = list[list.length - 1]
    const current = document.activeElement
    // 首尾循环；焦点已不在弹窗内（如点了遮罩）时拉回首个元素
    if (e.shiftKey && (current === first || !container.value?.contains(current))) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && (current === last || !container.value?.contains(current))) {
      e.preventDefault()
      first.focus()
    }
  }

  function release(): void {
    document.removeEventListener('keydown', onKeydown, true)
    document.documentElement.style.overflow = prevOverflow
    opener?.focus()
    opener = null
  }

  watch(active, async (on) => {
    if (on) {
      opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
      prevOverflow = document.documentElement.style.overflow
      document.documentElement.style.overflow = 'hidden'
      document.addEventListener('keydown', onKeydown, true)
      await nextTick()
      const target = (initialFocus ? container.value?.querySelector<HTMLElement>(initialFocus) : null)
        ?? focusables()[0] ?? container.value
      target?.focus()
    } else {
      release()
    }
  })

  // 弹窗打开时组件被销毁（路由切换等），也要释放滚动锁与监听
  onBeforeUnmount(() => { if (active.value) release() })
}
