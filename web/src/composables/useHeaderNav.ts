// 顶栏导航公共逻辑 —— 样式一 AppHeader 与样式二 Style2Header 共用
// 两套顶栏只是呈现不同，菜单数据、滚动实底、下拉开合、键盘操作、移动端抽屉的行为完全一致，
// 原先各写一份，已经出现过一边修了另一边没修的情况
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import type { MenuNode } from '@/api/menu'
import { useSiteStore } from '@/stores/site'
import { useWindowScroll } from './useWindowScroll'

/** 滚动超过该距离后顶栏切为实底 */
const SOLID_AFTER_PX = 20

/** 鼠标移出后延迟收起下拉，避免从菜单项移向下拉面板途中被误收起 */
const CLOSE_DELAY_MS = 120

export function useHeaderNav() {
  const route = useRoute()
  const siteStore = useSiteStore()
  const { scrollY } = useWindowScroll()

  const menu = computed<MenuNode[]>(() => siteStore.menu)
  // 电话未配置时为空，模板据此不展示电话入口（不再写死兜底号码，避免展示过时号码）
  const sitePhone = computed(() => siteStore.site.phone || '')
  const siteLogo = computed(() => siteStore.site.logo || '')
  const scrolled = computed(() => scrollY.value > SOLID_AFTER_PX)

  const menuOpen = ref(false)   // 移动端抽屉
  const openKey = ref('')       // 桌面端当前展开的下拉
  const expandedKey = ref('')   // 移动端当前展开的子菜单
  let closeTimer: ReturnType<typeof setTimeout> | undefined

  /** 一级栏目是否为当前页 */
  const isActive = (item: MenuNode) => route.path === item.path
  /** 子项跳转地址：同页锚点用 hash，否则直接 path */
  const childTo = (child: MenuNode) => (child.anchor ? `${child.path}#${child.anchor}` : child.path)

  function openDropdown(key: string): void {
    if (closeTimer) clearTimeout(closeTimer)
    openKey.value = key
  }

  function scheduleClose(): void {
    if (closeTimer) clearTimeout(closeTimer)
    closeTimer = setTimeout(() => { openKey.value = '' }, CLOSE_DELAY_MS)
  }

  /**
   * 焦点移出整个导航项（含其下拉）时才收起
   * 只监听 mouseleave 的话，键盘 Tab 进下拉后再 Tab 出去，下拉会一直挂着
   * @param e focusout 事件
   */
  function onFocusOut(e: FocusEvent): void {
    const wrap = e.currentTarget as HTMLElement | null
    const next = e.relatedTarget as Node | null
    if (!wrap || !next || !wrap.contains(next)) scheduleClose()
  }

  /** Esc 收起下拉与移动端抽屉 */
  function onEscape(): void {
    openKey.value = ''
    menuOpen.value = false
  }

  function closeMobile(): void {
    menuOpen.value = false
    expandedKey.value = ''
  }

  // 路由变化即收起全部菜单：点了锚点子项但页面未切换时抽屉也要收
  watch(() => route.fullPath, () => {
    openKey.value = ''
    closeMobile()
  })

  onMounted(() => {
    // store 内部已做去重，重复调用不会产生额外请求
    siteStore.fetchMenu()
    siteStore.fetchSite()
  })

  return {
    menu, sitePhone, siteLogo, scrolled,
    menuOpen, openKey, expandedKey,
    isActive, childTo, openDropdown, scheduleClose, onFocusOut, onEscape, closeMobile,
  }
}
