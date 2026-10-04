<template>
  <!-- 样式二顶栏：集团品牌风。深色首屏上透明底 + 白字，滚动后或无深色首屏的页面为白底 + 深字 -->
  <header
    class="rs-header fixed top-0 left-0 right-0 z-50 transition-[background-color,box-shadow] duration-300"
    :class="solid ? 'bg-white shadow-[0_1px_0_rgba(0,0,0,0.06)]' : 'bg-transparent'"
    @keydown.esc="onEscape"
  >
    <div class="mx-auto px-6 lg:px-10" style="max-width: var(--rs-content-max)">
      <div class="flex items-center justify-between h-[76px]">
        <RouterLink to="/" class="flex items-center gap-3 no-underline shrink-0" :aria-label="`${COMPANY_SHORT} 首页`">
          <img v-if="siteLogo" :src="siteLogo" :alt="COMPANY_SHORT" class="h-10 w-auto max-w-[160px] object-contain" width="144" height="40" fetchpriority="high" />
          <template v-else>
            <span class="w-10 h-10 flex items-center justify-center text-white text-lg font-bold" style="background: var(--rs-primary)" aria-hidden="true">恒</span>
            <span class="flex flex-col leading-none">
              <span class="font-bold text-lg transition-colors" :class="textColor">{{ COMPANY_SHORT }}</span>
              <span class="text-[10px] tracking-[0.25em] mt-1 transition-colors" :class="subColor">{{ COMPANY_EN }}</span>
            </span>
          </template>
        </RouterLink>

        <nav class="hidden lg:flex items-stretch gap-1 h-full" aria-label="主导航">
          <div
            v-for="item in menu"
            :key="item.key"
            class="relative flex"
            @mouseenter="openDropdown(item.key)"
            @mouseleave="scheduleClose"
            @focusin="openDropdown(item.key)"
            @focusout="onFocusOut"
          >
            <RouterLink
              :to="item.path"
              class="flex items-center px-4 text-sm font-medium transition-colors no-underline whitespace-nowrap rs-nav-link"
              :class="[textColor, { 'is-active': isActive(item) }]"
              :aria-current="isActive(item) ? 'page' : undefined"
              :aria-haspopup="item.children?.length ? 'true' : undefined"
              :aria-expanded="item.children?.length ? openKey === item.key : undefined"
            >{{ item.label }}</RouterLink>

            <Transition name="rs-dropdown">
              <div
                v-if="item.children?.length && openKey === item.key"
                class="absolute left-0 top-full min-w-48 bg-white shadow-xl py-2 border-t-2"
                style="border-color: var(--rs-primary)"
              >
                <RouterLink
                  v-for="child in item.children"
                  :key="child.key"
                  :to="childTo(child)"
                  class="block px-5 py-2.5 text-sm text-ink-700 transition-colors no-underline whitespace-nowrap rs-dropdown-link"
                >{{ child.label }}</RouterLink>
              </div>
            </Transition>
          </div>
        </nav>

        <div class="flex items-center gap-4 shrink-0">
          <MemberEntry class="hidden lg:flex transition-colors" :class="textColor" />
          <a
            v-if="sitePhone"
            :href="`tel:${sitePhone}`"
            class="rs-call hidden lg:flex items-center gap-2 px-5 h-10 text-sm font-medium text-white no-underline tabular-nums"
          >
            <PhoneIcon class="w-4 h-4" />
            {{ sitePhone }}
          </a>
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
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { COMPANY_EN, COMPANY_SHORT } from '@/config/brand'
import { useHeaderNav } from '@/composables/useHeaderNav'
import MemberEntry from './MemberEntry.vue'
import MobileNav from './MobileNav.vue'
import PhoneIcon from './PhoneIcon.vue'

const route = useRoute()
const {
  menu, sitePhone, siteLogo, scrolled,
  menuOpen, openKey, expandedKey,
  isActive, childTo, openDropdown, scheduleClose, onFocusOut, onEscape, closeMobile,
} = useHeaderNav()

/**
 * 带深色首屏的页面：首页与 8 个栏目页（样式二的首屏与栏目头图都是深色底）
 * 其余页面（详情、隐私、会员中心、404）顶部是白底，透明顶栏上的白字会看不见
 */
const DARK_HERO_ROUTES = new Set(['home', 'hvac', 'energy', 'smart', 'household', 'case', 'news', 'alliance', 'about'])
const onDarkHero = computed(() => DARK_HERO_ROUTES.has(String(route.name ?? '')))

// 实底：离开深色首屏、已滚动、或移动端抽屉展开（抽屉是白底，顶栏须同色）
const solid = computed(() => !onDarkHero.value || scrolled.value || menuOpen.value)
const textColor = computed(() => (solid.value ? 'text-ink-900' : 'text-white'))
const subColor = computed(() => (solid.value ? 'text-ink-500' : 'text-white/60'))
</script>

<style scoped>
/* 移动端抽屉跟随样式二的品牌红与直角 */
.rs-header {
  --nav-accent: var(--rs-primary);
  --nav-radius: 0;
}
.rs-nav-link {
  position: relative;
}
.rs-nav-link::after {
  content: '';
  position: absolute;
  left: 16px;
  right: 16px;
  bottom: 18px;
  height: 2px;
  background: var(--rs-primary);
  transform: scaleX(0);
  transition: transform 0.25s ease;
}
.rs-nav-link:hover::after,
.rs-nav-link.is-active::after {
  transform: scaleX(1);
}
.rs-nav-link:hover,
.rs-nav-link.is-active {
  color: var(--rs-primary-light) !important;
}
.bg-white .rs-nav-link:hover,
.bg-white .rs-nav-link.is-active {
  color: var(--rs-primary) !important;
}
.rs-dropdown-link:hover,
.rs-dropdown-link:focus-visible {
  background: var(--rs-primary);
  color: #fff;
}
.rs-call {
  background: var(--rs-primary);
  transition: background 0.2s ease;
}
.rs-call:hover {
  background: var(--rs-primary-dark);
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
