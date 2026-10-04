// 窗口滚动位置 —— 全站共享一份，顶栏实底切换与回顶按钮都读它
// 为什么是模块级单例而非每个组件各挂监听：顶栏、快捷操作区同时在页，
// 各自监听等于每次滚动触发多遍回调；共享一份只挂一个被动监听
import { ref, readonly } from 'vue'

const scrollY = ref(0)
let bound = false
let ticking = false

/** 按帧合并滚动事件：滚动一帧内可能触发多次，只在下一帧读一次位置 */
function onScroll(): void {
  if (ticking) return
  ticking = true
  requestAnimationFrame(() => {
    scrollY.value = window.scrollY
    ticking = false
  })
}

/**
 * 取窗口纵向滚动位置（只读）
 * 首次调用时挂上全局被动监听，之后复用同一份；页面整个生命周期内不卸载
 */
export function useWindowScroll() {
  if (!bound && typeof window !== 'undefined') {
    bound = true
    scrollY.value = window.scrollY
    window.addEventListener('scroll', onScroll, { passive: true })
  }
  return { scrollY: readonly(scrollY) }
}

/** 平滑回到页首 */
export function scrollToTop(): void {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

/**
 * 滚动到页面内某个锚点
 * 顶部固定导航的遮挡由 html 的 scroll-padding-top 统一补偿，这里不再手算偏移
 * @param id 目标元素 id（不带 #）
 * @returns 是否找到目标元素
 */
export function scrollToAnchor(id: string): boolean {
  const el = document.getElementById(id)
  if (!el) return false
  el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  return true
}
