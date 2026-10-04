// 进入视口渐显 —— 替代原先直接 el.classList.add 的自定义指令
// 由响应式集合记录「已进入视口」的元素 key，模板按 key 绑定 visible 类，
// 组件内不再直接改 DOM 的 class
import { reactive, onBeforeUnmount } from 'vue'
import type { ComponentPublicInstance } from 'vue'

/**
 * 进入视口渐显
 * @param threshold 元素可见比例达到多少时触发，默认 0.12
 * @returns shown 已显现的 key 集合；track(key) 返回可直接绑到 :ref 的回调
 */
export function useReveal(threshold = 0.12) {
  const shown = reactive(new Set<string>())
  // 元素 → key：同一元素重渲染时函数 ref 会被反复调用，已观察过的不再重复注册
  const keyOf = new WeakMap<Element, string>()

  const prefersReduced = typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const observer = typeof IntersectionObserver === 'undefined'
    ? null
    : new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return
        const key = keyOf.get(e.target)
        if (key) shown.add(key)
        observer?.unobserve(e.target)
      })
    }, { threshold })

  /**
   * 生成函数 ref
   * @param key 元素标识，同一组件内唯一
   */
  function track(key: string) {
    return (target: Element | ComponentPublicInstance | null) => {
      const el = target instanceof Element ? target : null
      if (!el || keyOf.has(el) || shown.has(key)) return
      // 不支持观察或偏好减少动效时直接显现，不做入场动画
      if (!observer || prefersReduced) {
        shown.add(key)
        return
      }
      keyOf.set(el, key)
      observer.observe(el)
    }
  }

  onBeforeUnmount(() => observer?.disconnect())

  return { shown, track }
}
