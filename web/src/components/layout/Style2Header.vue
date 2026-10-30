<template>
  <!-- 样式二顶栏（浅色）：深色首屏上透明底 + 白字，滚动后或无深色首屏的页面为浅色毛玻璃 + 深字 -->
  <header
    class="rs-header fixed top-0 left-0 right-0 z-50 transition-[background-color,box-shadow] duration-300"
    :class="solid ? 'rs-header-glass shadow-[0_1px_0_rgba(0,0,0,0.08)]' : 'bg-transparent'"
    @keydown.esc="onEscape"
  >
    <!-- 左右边距与正文容器同一 token，任何屏宽下 Logo 与板块内容左缘对齐 -->
    <div class="mx-auto" style="max-width: var(--rs-content-max); padding-inline: var(--rs-content-px)">
      <div class="flex items-center justify-between h-[76px]">
        <RouterLink to="/" class="flex items-center gap-3 no-underline shrink-0" :aria-label="`${companyShort} 首页`">
          <img v-if="siteLogo" :src="siteLogo" :alt="companyShort" class="h-10 w-auto max-w-[160px] object-contain" width="144" height="40" fetchpriority="high" />
          <template v-else>
            <span class="w-10 h-10 flex items-center justify-center text-white text-lg font-bold" style="background: var(--rs-primary)" aria-hidden="true">恒</span>
            <span class="flex flex-col leading-none">
              <span class="font-bold text-lg transition-colors" :class="textColor">{{ companyShort }}</span>
              <span class="text-[10px] tracking-[0.25em] mt-1 transition-colors" :class="subColor">{{ companyEn }}</span>
            </span>
          </template>
        </RouterLink>

        <!-- 一行放不下的栏目收进末尾「更多」，见 useNavOverflow；占满 Logo 与右侧入口之间的宽度，栏目靠右排 -->
        <nav ref="navRef" class="hidden lg:flex items-stretch justify-end gap-1 h-full flex-1 min-w-0 mx-6" aria-label="主导航">
          <div
            v-for="(item, idx) in menu"
            :key="item.key"
            data-nav-item
            class="relative flex"
            :class="{ 'rs-nav-item--overflow': isOverflow(idx) }"
            :aria-hidden="isOverflow(idx) || undefined"
            @mouseenter="openDropdown(item.key)"
            @mouseleave="scheduleClose"
            @focusin="openDropdown(item.key)"
            @focusout="onFocusOut"
          >
            <NavLink
              :to="item.path"
              :external="item.external"
              class="flex items-center px-4 text-sm font-medium transition-colors no-underline whitespace-nowrap rs-nav-link"
              :class="[textColor, { 'is-active': isActive(item) }]"
              :aria-current="isActive(item) ? 'page' : undefined"
              :aria-controls="item.children?.length ? `nav-panel-${item.key}` : undefined"
              :aria-expanded="item.children?.length ? openKey === item.key : undefined"
            >{{ item.label }}</NavLink>

            <Transition name="rs-dropdown">
              <!-- 子项带分组：超级菜单多列展示，显示分组标题与说明 -->
              <div
                v-if="item.children?.length && openKey === item.key && groupChildren(item.children)"
                :id="`nav-panel-${item.key}`"
                class="rs-mega rs-panel absolute top-full"
                :class="idx >= visibleMenu.length / 2 ? 'right-0' : 'left-0'"
                :style="{ '--mega-cols': Math.min(groupChildren(item.children)?.length ?? 1, 4) }"
              >
                <section v-for="g in groupChildren(item.children)" :key="g.title" class="min-w-0">
                  <p v-if="g.title" class="rs-mega-title">{{ g.title }}</p>
                  <NavLink v-for="child in g.items" :key="child.key" :to="childTo(child)" :external="child.external" class="rs-dropdown-link rs-mega-link">
                    <img v-if="child.icon" :src="child.icon" alt="" class="rs-mega-icon" width="24" height="24" loading="lazy" />
                    <span class="min-w-0">
                      <span class="block">{{ child.label }}</span>
                      <span v-if="child.desc" class="rs-mega-desc">{{ child.desc }}</span>
                    </span>
                  </NavLink>
                </section>
              </div>
              <!-- 无分组：保持原有单列 -->
              <div
                v-else-if="item.children?.length && openKey === item.key"
                class="rs-panel absolute left-0 top-full min-w-48 py-2"
              >
                <NavLink
                  v-for="child in item.children"
                  :key="child.key"
                  :to="childTo(child)"
                  :external="child.external"
                  class="block px-5 py-2.5 text-sm text-ink-700 transition-colors no-underline whitespace-nowrap rs-dropdown-link"
                >{{ child.label }}</NavLink>
              </div>
            </Transition>
          </div>

          <!-- 「更多」：始终渲染以便测量宽度，无溢出时隐藏 -->
          <div
            data-nav-more
            class="relative flex"
            :class="{ 'rs-nav-item--overflow': !overflowMenu.length }"
            :aria-hidden="!overflowMenu.length || undefined"
            @mouseenter="openDropdown(MORE_KEY)"
            @mouseleave="scheduleClose"
            @focusin="openDropdown(MORE_KEY)"
            @focusout="onFocusOut"
          >
            <button
              type="button"
              class="flex items-center px-4 text-sm font-medium transition-colors whitespace-nowrap rs-nav-link rs-nav-more"
              :class="[textColor, { 'is-active': overflowMenu.some(isActive) }]"
              :aria-controls="`nav-panel-${MORE_KEY}`"
              :aria-expanded="openKey === MORE_KEY"
              @click="openDropdown(MORE_KEY)"
            >更多</button>
            <Transition name="rs-dropdown">
              <div
                v-if="overflowMenu.length && openKey === MORE_KEY"
                :id="`nav-panel-${MORE_KEY}`"
                class="rs-more rs-panel absolute right-0 top-full min-w-56 py-2"
              >
                <section v-for="item in overflowMenu" :key="item.key" class="rs-more-group">
                  <NavLink
                    :to="item.path"
                    :external="item.external"
                    class="block px-5 py-2.5 text-sm font-bold text-ink-900 no-underline whitespace-nowrap rs-dropdown-link"
                    :aria-current="isActive(item) ? 'page' : undefined"
                  >{{ item.label }}</NavLink>
                  <NavLink
                    v-for="child in item.children"
                    :key="child.key"
                    :to="childTo(child)"
                    :external="child.external"
                    class="block pl-9 pr-5 py-2 text-sm text-ink-700 no-underline whitespace-nowrap rs-dropdown-link"
                  >{{ child.label }}</NavLink>
                </section>
              </div>
            </Transition>
          </div>
        </nav>

        <div class="flex items-center gap-4 shrink-0">
          <SearchEntry class="hidden lg:inline-flex transition-colors" :class="textColor" />
          <MemberEntry class="hidden lg:flex transition-colors" :class="textColor" />
          <!-- 常驻咨询入口：顶栏容器定宽，导航 + 会员 + 咨询已占满，电话改由右下角悬浮栏、移动端抽屉与页脚承担 -->
          <button
            type="button"
            class="rs-call hidden lg:flex items-center px-4 h-8 rounded-full text-sm font-medium text-white"
            @click="openLead('consult', '顶栏')"
          >
            项目咨询
          </button>
          <button
            type="button"
            class="lg:hidden p-2 -mr-2 transition-colors"
            :class="textColor"
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
    </div>

    <Transition name="rs-drawer">
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
// 样式二顶栏：行为逻辑见 useHeaderNav，本组件只管呈现与「透明/实底」切换
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useBrand } from '@/composables/useBrand'
import { groupChildren, useHeaderNav } from '@/composables/useHeaderNav'
import { MORE_KEY, useNavOverflow } from '@/composables/useNavOverflow'
import { useLeadModal } from '@/composables/useLeadModal'
import MemberEntry from './MemberEntry.vue'
import SearchEntry from './SearchEntry.vue'
import MobileNav from './MobileNav.vue'
import NavLink from './NavLink.vue'
import { channelHeroReady } from '@/composables/useChannelHero'

const route = useRoute()
const {
  menu, sitePhone, siteLogo, scrolled,
  menuOpen, openKey, expandedKey,
  isActive, childTo, openDropdown, scheduleClose, onFocusOut, onEscape, closeMobile,
} = useHeaderNav()
const { companyShort, companyEn } = useBrand()
const { openLead } = useLeadModal()
const navRef = ref<HTMLElement | null>(null)
const { visibleMenu, overflowMenu, isOverflow } = useNavOverflow(navRef, menu)

/**
 * 带深色首屏的页面：首页与 8 个栏目页（样式二的首屏与栏目头图都是深色底）
 * 其余页面（详情、隐私、会员中心、404）顶部是白底，透明顶栏上的白字会看不见
 */
const DARK_HERO_ROUTES = new Set([
  'home', 'business', 'business-energy', 'business-building', 'business-living',
  'news', 'alliance', 'about',
])
// 通用栏目路由能匹配任意地址，是否深色头图由栏目页告知（不存在、加载失败时是浅底）
const onDarkHero = computed(() =>
  route.name === 'channel' ? channelHeroReady.value : DARK_HERO_ROUTES.has(String(route.name ?? '')))

// 实底：离开深色首屏、已滚动、或移动端抽屉展开（抽屉是白底，顶栏须同色）
const solid = computed(() => !onDarkHero.value || scrolled.value || menuOpen.value)
const textColor = computed(() => (solid.value ? 'text-ink-900' : 'text-white'))
const subColor = computed(() => (solid.value ? 'text-ink-500' : 'text-white/60'))
</script>

<style scoped>
/* 移动端抽屉：按钮蓝 + 胶囊 */
.rs-header {
  --nav-accent: var(--rs-primary);
  --nav-radius: var(--radius-pill);
}
/* 浅色毛玻璃：苹果官网首页同款；不支持模糊时回落实底 */
.rs-header-glass {
  background-color: rgba(255, 255, 255, 0.8);
  -webkit-backdrop-filter: saturate(180%) blur(20px);
  backdrop-filter: saturate(180%) blur(20px);
}
@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .rs-header-glass { background-color: var(--color-canvas); }
}
/* 导航：不加下划线色条，当前项 / 悬停只把字压到最深（透明底上是纯白） */
.rs-nav-link {
  position: relative;
  opacity: 0.8;
  transition: opacity var(--dur-fast);
}
.rs-nav-link:hover,
.rs-nav-link.is-active { opacity: 1; }
/* 下拉：大圆角浮层，悬停整行浅灰底，不用整行品牌色块 */
.rs-dropdown-link:hover,
.rs-dropdown-link:focus-visible {
  background: var(--color-surface);
  color: var(--color-ink-900);
}
.rs-panel {
  background: var(--color-elevated);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-3);
  overflow: hidden;
}
/* 超级菜单：按分组数等分列，宽度不超过视口 */
.rs-mega {
  display: grid;
  grid-template-columns: repeat(var(--mega-cols, 1), minmax(200px, 1fr));
  gap: 0 8px;
  width: max-content;
  max-width: min(960px, calc(100vw - 48px));
  padding: 12px 8px;
}
.rs-mega-title {
  margin: 0 0 4px;
  padding: 0 12px 8px;
  font-size: 12px;
  font-weight: 700;
  color: var(--rs-text-muted);
  border-bottom: 1px solid var(--rs-border);
}
.rs-mega-link { display: flex; align-items: flex-start; gap: 10px; padding: 10px 12px; font-size: 14px; color: var(--rs-text-dark); text-decoration: none; transition: background 0.2s ease, color 0.2s ease; }
.rs-mega-icon { flex-shrink: 0; width: 24px; height: 24px; margin-top: 1px; object-fit: contain; }
.rs-mega-desc { display: block; margin-top: 2px; font-size: 12px; line-height: 1.5; color: var(--rs-text-muted); }
/* 被收纳进「更多」的栏目：脱离文档流且不可见、不可聚焦，但保留宽度供重新测量 */
.rs-nav-item--overflow {
  position: absolute;
  visibility: hidden;
  pointer-events: none;
}
.rs-nav-more { background: none; border: 0; cursor: pointer; font-family: inherit; }
.rs-more {
  max-height: calc(100vh - 100px);
  overflow-y: auto;
}
.rs-more-group + .rs-more-group { margin-top: 4px; padding-top: 4px; border-top: 1px solid var(--rs-border); }
.rs-call {
  background: var(--rs-primary);
  transition: background 0.2s ease;
}
.rs-call:hover {
  background: var(--color-action-hover);
}
.rs-dropdown-enter-active,
.rs-dropdown-leave-active,
.rs-drawer-enter-active,
.rs-drawer-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}
.rs-dropdown-enter-from,
.rs-dropdown-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
.rs-drawer-enter-from,
.rs-drawer-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
