// 顶栏一级菜单溢出收纳 —— 样式一 AppHeader 与样式二 Style2Header 共用
// 一级栏目数量由后台配置，条数多或屏宽较窄时一行放不下，会把「项目咨询」等入口挤出视口；
// 这里按导航区实际宽度算出能完整显示的条数，其余收进末尾的「更多」下拉
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount, type Ref } from 'vue'
import type { MenuNode } from '@/api/menu'

/** 「更多」下拉在 openKey 中使用的键，不会与后台栏目 key 冲突 */
export const MORE_KEY = '__nav_more__'

/**
 * @param navRef 导航容器：须为 flex-1 min-w-0，其宽度即可用宽度；
 *   直接子元素中一级栏目带 data-nav-item，「更多」带 data-nav-more，
 *   被收纳的项保持渲染但脱离文档流且不可见，以便随时重新测量宽度
 * @param menu 一级栏目
 */
export function useNavOverflow(navRef: Ref<HTMLElement | null>, menu: Ref<MenuNode[]>) {
  const visibleCount = ref(Number.POSITIVE_INFINITY)

  const visibleMenu = computed(() => menu.value.slice(0, visibleCount.value))
  const overflowMenu = computed(() => menu.value.slice(visibleCount.value))

  function measure(): void {
    const nav = navRef.value
    // 移动端导航区 display:none，宽度为 0，不测量
    if (!nav || !nav.clientWidth) return
    const items = Array.from(nav.querySelectorAll<HTMLElement>(':scope > [data-nav-item]'))
    const more = nav.querySelector<HTMLElement>(':scope > [data-nav-more]')
    const gap = parseFloat(getComputedStyle(nav).columnGap) || 0
    const widths = items.map(el => el.offsetWidth)
    const avail = nav.clientWidth
    const total = widths.reduce((s, w) => s + w, 0) + gap * Math.max(widths.length - 1, 0)
    if (total <= avail) {
      visibleCount.value = widths.length
      return
    }
    let used = more?.offsetWidth ?? 0
    let count = 0
    for (const w of widths) {
      if (used + gap + w > avail) break
      used += gap + w
      count++
    }
    visibleCount.value = count
  }

  let ro: ResizeObserver | undefined
  onMounted(() => {
    measure()
    if (typeof ResizeObserver !== 'undefined' && navRef.value) {
      ro = new ResizeObserver(() => measure())
      ro.observe(navRef.value)
    }
    // 网络字体加载完成后文字宽度会变
    document.fonts?.ready.then(() => measure()).catch(() => {})
  })
  onBeforeUnmount(() => ro?.disconnect())

  // 菜单数据异步到达或在后台修改后重新测量
  watch(() => menu.value.map(m => m.label).join('|'), () => nextTick(measure))

  /** 第 idx 个一级栏目是否被收纳 */
  const isOverflow = (idx: number) => idx >= visibleCount.value

  return { visibleMenu, overflowMenu, isOverflow, measure }
}
