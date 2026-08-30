// 锚点高亮 composable —— 用 IntersectionObserver 监听各板块，返回当前激活板块 id
// 避免监听 scroll 事件造成的性能开销
import { ref, onMounted, onBeforeUnmount } from 'vue'

/**
 * 监听页面内各 section，返回当前视口占比最大的板块 id
 * @param sectionIds 需要监听的板块 id 列表（与 DOM 元素 id 对应）
 */
export function useScrollSpy(sectionIds: string[]) {
  const activeId = ref<string>(sectionIds[0] || '')
  let observer: IntersectionObserver | null = null
  // 记录各板块当前可见比例，取最大者为激活项
  const ratios = new Map<string, number>()

  onMounted(() => {
    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          ratios.set((e.target as HTMLElement).id, e.isIntersecting ? e.intersectionRatio : 0)
        })
        let max = 0
        let current = activeId.value
        ratios.forEach((ratio, id) => {
          if (ratio > max) {
            max = ratio
            current = id
          }
        })
        if (max > 0) activeId.value = current
      },
      // 多档阈值，板块进出视口时平滑更新占比
      { threshold: [0, 0.25, 0.5, 0.75, 1], rootMargin: '-64px 0px 0px 0px' }
    )
    sectionIds.forEach((id) => {
      const el = document.getElementById(id)
      if (el) observer!.observe(el)
    })
  })

  onBeforeUnmount(() => {
    observer?.disconnect()
    observer = null
  })

  return { activeId }
}

/**
 * 平滑滚动到指定板块，补偿固定顶栏高度
 * @param id 目标板块 id
 */
export function scrollToSection(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  const navHeight = parseInt(
    getComputedStyle(document.documentElement).getPropertyValue('--zrh-nav-height')
  ) || 64
  const top = el.getBoundingClientRect().top + window.scrollY - navHeight
  window.scrollTo({ top, behavior: 'smooth' })
}
