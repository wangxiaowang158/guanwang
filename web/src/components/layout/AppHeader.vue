<template>
  <!-- 样式一顶栏：品牌 + 数据驱动主导航（悬停/键盘聚焦展开子菜单）+ 会员入口 + 联系电话 -->
  <header
    class="fixed top-0 left-0 right-0 z-50 transition-[background-color,box-shadow] duration-300"
    :class="menuOpen ? 'bg-white' : ['app-header-glass', { 'shadow-[0_1px_0_rgba(15,23,42,0.08)]': scrolled }]"
    @keydown.esc="onEscape"
  >
    <div class="site-container">
      <div class="flex items-center justify-between h-[var(--nav-h)]">
        <RouterLink to="/" class="flex items-center gap-2.5 no-underline shrink-0 mr-8" :aria-label="`${companyShort} 首页`">
          <img v-if="siteLogo" :src="siteLogo" :alt="companyShort" class="h-9 w-auto max-w-[160px] object-contain" width="144" height="36" fetchpriority="high" />
          <template v-else>
            <span class="w-9 h-9 rounded-md bg-brand-600 flex items-center justify-center text-white text-base font-bold" aria-hidden="true">恒</span>
            <span class="flex flex-col leading-none">
              <span class="font-bold text-[17px] text-ink-900 tracking-wide">{{ companyShort }}</span>
              <span class="text-[10px] text-ink-500 tracking-[0.2em] mt-1">{{ companyEn }}</span>
            </span>
          </template>
        </RouterLink>

        <!-- 桌面导航 -->
        <!-- 一行放不下的栏目收进末尾「更多」，见 useNavOverflow -->
        <nav ref="navRef" class="hidden lg:flex items-stretch h-full flex-1 min-w-0" aria-label="主导航">
          <div
            v-for="(item, idx) in menu"
            :key="item.key"
            data-nav-item
            class="relative flex"
            :class="{ 'nav-item--overflow': isOverflow(idx) }"
            :aria-hidden="isOverflow(idx) || undefined"
            @mouseenter="openDropdown(item.key)"
            @mouseleave="scheduleClose"
            @focusin="openDropdown(item.key)"
            @focusout="onFocusOut"
          >
            <NavLink
              :to="item.path"
              :external="item.external"
              class="nav-link"
              :class="{ 'is-active': isActive(item) }"
              :aria-current="isActive(item) ? 'page' : undefined"
              :aria-controls="item.children?.length ? `nav-panel-${item.key}` : undefined"
              :aria-expanded="item.children?.length ? openKey === item.key : undefined"
            >
              {{ item.label }}
              <svg v-if="item.children?.length" class="w-3 h-3 transition-transform" :class="openKey === item.key ? 'rotate-180' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </NavLink>

            <Transition name="dropdown">
              <!-- 子项带分组：超级菜单多列展示，显示分组标题与说明 -->
              <div
                v-if="item.children?.length && openKey === item.key && groupChildren(item.children)"
                :id="`nav-panel-${item.key}`"
                class="dropdown-panel dropdown-panel--mega"
                :class="{ 'is-right': idx >= visibleMenu.length / 2 }"
                :style="{ '--mega-cols': Math.min(groupChildren(item.children)?.length ?? 1, 4) }"
              >
                <section v-for="g in groupChildren(item.children)" :key="g.title" class="mega-group">
                  <p v-if="g.title" class="dropdown-title">{{ g.title }}</p>
                  <NavLink v-for="child in g.items" :key="child.key" :to="childTo(child)" :external="child.external" class="dropdown-link mega-link">
                    <img v-if="child.icon" :src="child.icon" alt="" class="mega-icon" width="24" height="24" loading="lazy" />
                    <span class="min-w-0">
                      <span class="block">{{ child.label }}</span>
                      <span v-if="child.desc" class="mega-desc">{{ child.desc }}</span>
                    </span>
                  </NavLink>
                </section>
              </div>
              <!-- 无分组：保持原有单列 -->
              <div v-else-if="item.children?.length && openKey === item.key" class="dropdown-panel">
                <p class="dropdown-title">{{ item.label }}</p>
                <NavLink
                  v-for="child in item.children"
                  :key="child.key"
                  :to="childTo(child)"
                  :external="child.external"
                  class="dropdown-link"
                >{{ child.label }}</NavLink>
              </div>
            </Transition>
          </div>

          <!-- 「更多」：始终渲染以便测量宽度，无溢出时隐藏 -->
          <div
            data-nav-more
            class="relative flex"
            :class="{ 'nav-item--overflow': !overflowMenu.length }"
            :aria-hidden="!overflowMenu.length || undefined"
            @mouseenter="openDropdown(MORE_KEY)"
            @mouseleave="scheduleClose"
            @focusin="openDropdown(MORE_KEY)"
            @focusout="onFocusOut"
          >
            <button
              type="button"
              class="nav-link"
              :class="{ 'is-active': overflowMenu.some(isActive) }"
              :aria-controls="`nav-panel-${MORE_KEY}`"
              :aria-expanded="openKey === MORE_KEY"
              @click="openDropdown(MORE_KEY)"
            >
              更多
              <svg class="w-3 h-3 transition-transform" :class="openKey === MORE_KEY ? 'rotate-180' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <Transition name="dropdown">
              <div v-if="overflowMenu.length && openKey === MORE_KEY" :id="`nav-panel-${MORE_KEY}`" class="dropdown-panel dropdown-panel--more">
                <section v-for="item in overflowMenu" :key="item.key" class="more-group">
                  <NavLink :to="item.path" :external="item.external" class="dropdown-link more-parent" :aria-current="isActive(item) ? 'page' : undefined">{{ item.label }}</NavLink>
                  <NavLink
                    v-for="child in item.children"
                    :key="child.key"
                    :to="childTo(child)"
                    :external="child.external"
                    class="dropdown-link more-child"
                  >{{ child.label }}</NavLink>
                </section>
              </div>
            </Transition>
          </div>
        </nav>

        <SearchEntry class="hidden lg:inline-flex mr-2 text-ink-700" />
        <MemberEntry class="hidden lg:flex mr-5 text-ink-700" />
        <!-- 常驻咨询入口：顶栏容器定宽，导航 + 会员 + 咨询已占满，电话改由右下角悬浮栏、移动端抽屉与页脚承担 -->
        <button
          type="button"
          class="hidden lg:flex items-center px-5 h-10 rounded-md bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors shrink-0"
          @click="openLead('consult', '顶栏')"
        >
          项目咨询
        </button>

        <button
          type="button"
          class="lg:hidden p-2 -mr-2 rounded-md text-ink-700 hover:bg-surface"
          :aria-label="menuOpen ? '关闭菜单' : '打开菜单'"
          :aria-expanded="menuOpen"
          aria-controls="mobile-nav"
          @click="menuOpen = !menuOpen"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path v-if="!menuOpen" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
            <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>

    <Transition name="drawer">
      <MobileNav
        v-if="menuOpen"
        id="mobile-nav"
        v-model:expanded-key="expandedKey"
        :menu="menu"
        :phone="sitePhone"
        :is-active="isActive"
        :child-to="childTo"
        @navigate="closeMobile"
      />
    </Transition>
  </header>
</template>

<script setup lang="ts">
// 样式一顶栏：行为逻辑见 useHeaderNav，本组件只管呈现
import { ref } from 'vue'
import { useBrand } from '@/composables/useBrand'
import { groupChildren, useHeaderNav } from '@/composables/useHeaderNav'
import { MORE_KEY, useNavOverflow } from '@/composables/useNavOverflow'
import { useLeadModal } from '@/composables/useLeadModal'
import MemberEntry from './MemberEntry.vue'
import SearchEntry from './SearchEntry.vue'
import MobileNav from './MobileNav.vue'
import NavLink from './NavLink.vue'

const {
  menu, sitePhone, siteLogo, scrolled,
  menuOpen, openKey, expandedKey,
  isActive, childTo, openDropdown, scheduleClose, onFocusOut, onEscape, closeMobile,
} = useHeaderNav()
const navRef = ref<HTMLElement | null>(null)
const { visibleMenu, overflowMenu, isOverflow } = useNavOverflow(navRef, menu)
const { companyShort, companyEn } = useBrand()
const { openLead } = useLeadModal()
</script>

<style scoped>
/* 毛玻璃顶栏：半透白底 + 提饱和模糊，下方内容透出色彩但文字仍可读；
   不做全透明：样式一部分页面顶部是浅底，透明顶栏上的深字与内容会叠在一起 */
.app-header-glass {
  background-color: rgba(255, 255, 255, 0.8);
  -webkit-backdrop-filter: saturate(180%) blur(20px);
  backdrop-filter: saturate(180%) blur(20px);
}
/* 不支持背景模糊的浏览器回落实底，避免半透明叠字 */
@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .app-header-glass { background-color: #fff; }
}

.nav-link {
  position: relative;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 14px;
  font-size: 15px;
  color: var(--color-ink-700);
  white-space: nowrap;
  transition: color var(--dur-fast);
}
.nav-link:hover,
.nav-link.is-active { color: var(--color-brand-600); }
/* 当前栏目底部品牌色指示条 */
.nav-link::after {
  content: '';
  position: absolute;
  left: 14px; right: 14px; bottom: 0;
  height: 2px;
  background: var(--color-brand-600);
  transform: scaleX(0);
  transition: transform var(--dur-base) var(--ease-out);
}
.nav-link.is-active::after,
.nav-link:hover::after { transform: scaleX(1); }

.dropdown-panel {
  position: absolute;
  left: 0;
  top: 100%;
  min-width: 220px;
  padding: 12px 8px;
  background: #fff;
  border: 1px solid var(--color-line);
  border-top: 2px solid var(--color-brand-600);
  border-radius: 0 0 var(--radius-md) var(--radius-md);
  box-shadow: var(--shadow-2);
}
.dropdown-title {
  margin: 0 0 6px;
  padding: 0 12px 8px;
  font-size: 12px;
  color: var(--color-ink-500);
  border-bottom: 1px solid var(--color-line);
}
.dropdown-link {
  display: block;
  padding: 9px 12px;
  font-size: 14px;
  color: var(--color-ink-700);
  border-radius: var(--radius-sm);
  white-space: nowrap;
  transition: background var(--dur-fast), color var(--dur-fast);
}
.dropdown-link:hover,
.dropdown-link:focus-visible {
  background: var(--color-brand-50);
  color: var(--color-brand-600);
}

/* 超级菜单：按分组数等分列，每列至少 200px；前半段菜单项靠左对齐父项向右展开，
   后半段（.is-right）靠右对齐向左展开，避免靠右的菜单项面板超出视口右侧 */
.dropdown-panel--mega.is-right { left: auto; right: 0; }
.dropdown-panel--mega {
  display: grid;
  grid-template-columns: repeat(var(--mega-cols, 1), minmax(200px, 1fr));
  gap: 8px 16px;
  width: max-content;
  max-width: min(960px, calc(100vw - 48px));
  padding: 16px;
}
.mega-group { min-width: 0; }
.mega-link { display: flex; align-items: flex-start; gap: 10px; white-space: normal; }
.mega-icon { flex-shrink: 0; width: 24px; height: 24px; margin-top: 1px; object-fit: contain; }
.mega-desc { display: block; margin-top: 2px; font-size: 12px; line-height: 1.5; color: var(--color-ink-500); }

/* 被收纳进「更多」的栏目：脱离文档流且不可见、不可聚焦，但保留宽度供重新测量 */
.nav-item--overflow {
  position: absolute;
  visibility: hidden;
  pointer-events: none;
}
.nav-link { background: none; border: 0; cursor: pointer; font-family: inherit; }
.dropdown-panel--more {
  left: auto;
  right: 0;
  max-height: calc(100vh - var(--nav-h) - 24px);
  overflow-y: auto;
}
.more-group + .more-group { margin-top: 6px; padding-top: 6px; border-top: 1px solid var(--color-line); }
.more-parent { font-weight: 600; color: var(--color-ink-900); }
.more-child { padding-left: 24px; }

.dropdown-enter-active,
.dropdown-leave-active,
.drawer-enter-active,
.drawer-leave-active {
  transition: opacity var(--dur-fast) ease, transform var(--dur-fast) ease;
}
.dropdown-enter-from,
.dropdown-leave-to { opacity: 0; transform: translateY(-4px); }
.drawer-enter-from,
.drawer-leave-to { opacity: 0; transform: translateY(-8px); }
</style>
