// 数字滚动动效 composable —— 元素进入视口时从 0 滚动到目标值，仅触发一次
// 用 IntersectionObserver 触发，requestAnimationFrame 驱动缓动，尊重 reduced-motion
import { ref, watch, onBeforeUnmount } from 'vue'
import type { Ref } from 'vue'

/**
 * 数字从 0 滚动到目标值，元素进入视口时触发
 * @param elRef 绑定到展示元素的模板 ref（由调用方声明并绑定到 DOM）
 * @param target 目标数值
 * @param duration 动画时长（ms），默认 1500
 * @returns display 当前显示值
 */
export function useCountUp(
  elRef: Ref<HTMLElement | undefined>,
  target: number,
  duration = 1500
): { display: Ref<number> } {
  const display = ref(0)
  let observer: IntersectionObserver | null = null
  let rafId = 0
  let played = false

  // easeOutCubic 缓动，结尾平滑减速
  const ease = (t: number) => 1 - Math.pow(1 - t, 3)

  function run() {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced) {
      display.value = target
      return
    }
    const start = performance.now()
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1)
      display.value = Math.round(ease(progress) * target)
      if (progress < 1) rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
  }

  // 元素挂载后再建立观察（栏目数据异步加载，元素可能晚于 onMounted 出现）
  watch(
    elRef,
    (el) => {
      if (!el || observer) return
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting && !played) {
              played = true
              run()
              observer?.disconnect()
            }
          })
        },
        { threshold: 0.4 }
      )
      observer.observe(el)
    },
    { immediate: true }
  )

  onBeforeUnmount(() => {
    observer?.disconnect()
    observer = null
    if (rafId) cancelAnimationFrame(rafId)
  })

  return { display }
}
