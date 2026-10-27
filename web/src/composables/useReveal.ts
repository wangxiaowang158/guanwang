// 进入视口渐显 —— 替代原先直接 el.classList.add 的自定义指令
// 由响应式集合记录「已进入视口」的元素 key，模板按 key 绑定 visible 类，
// 组件内不再直接改 DOM 的 class
import { reactive, onBeforeUnmount } from 'vue'
import type { ComponentPublicInstance } from 'vue'

/**
 * 进入视口渐显
 * 按「是否进入视口」触发，而不是按元素自身的可见比例：
 * 比例的分母是元素面积，超高区块（长列表、长正文）在小屏上可见比例永远到不了阈值，
 * 会一直停在透明态。改用 threshold 0 + 底边内缩，露出一截即触发
 * @param bottomInset 视口底边内缩比例，元素顶端越过这条线才显现，默认 8%
 * @returns shown 已显现的 key 集合；track(key) 返回可直接绑到 :ref 的回调
 */
export function useReveal(bottomInset = 0.08) {
  const shown = reactive(new Set<string>())
  // 元素 → key：同一元素重渲染时函数 ref 会被反复调用，已观察过的不再重复注册
  const keyOf = new WeakMap<Element, string>()
  // key → 当前在观察的元素：元素卸载（函数 ref 以 null 回调）时据此停止观察，
  // 否则切换栏目后还没滚到的旧元素会一直挂在 observer 上，脱离文档的 DOM 无法回收
  const elOf = new Map<string, Element>()

  const prefersReduced = typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const stopWatching = (key: string) => {
    const el = elOf.get(key)
    if (!el) return
    observer?.unobserve(el)
    elOf.delete(key)
  }

  const observer = typeof IntersectionObserver === 'undefined'
    ? null
    : new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return
        const key = keyOf.get(e.target)
        if (!key) return
        shown.add(key)
        stopWatching(key)
      })
    }, { threshold: 0, rootMargin: `0px 0px -${Math.round(bottomInset * 100)}% 0px` })

  /**
   * 生成函数 ref
   * @param key 元素标识，同一组件内唯一
   */
  function track(key: string) {
    return (target: Element | ComponentPublicInstance | null) => {
      const el = target instanceof Element ? target : null
      // 卸载或换了元素：先停掉旧元素的观察
      if (elOf.get(key) !== el) stopWatching(key)
      if (!el || keyOf.has(el) || shown.has(key)) return
      // 不支持观察或偏好减少动效时直接显现，不做入场动画
      if (!observer || prefersReduced) {
        shown.add(key)
        return
      }
      keyOf.set(el, key)
      elOf.set(key, el)
      observer.observe(el)
    }
  }

  onBeforeUnmount(() => observer?.disconnect())

  return { shown, track }
}
