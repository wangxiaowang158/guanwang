<template>
  <!-- 样式一顶栏：品牌 + 数据驱动主导航（悬停/键盘聚焦展开子菜单）+ 会员入口 + 联系电话 -->
  <header
    class="fixed top-0 left-0 right-0 z-50 transition-[background-color,box-shadow] duration-300"
    :class="scrolled || menuOpen ? 'bg-white shadow-[0_1px_0_rgba(15,23,42,0.08)]' : 'bg-white/90 backdrop-blur-md'"
    @keydown.esc="onEscape"
  >
    <div class="site-container">
      <div class="flex items-center justify-between h-[var(--nav-h)]">
        <RouterLink to="/" class="flex items-center gap-2.5 no-underline shrink-0 mr-8" :aria-label="`${COMPANY_SHORT} 首页`">
          <img v-if="siteLogo" :src="siteLogo" :alt="COMPANY_SHORT" class="h-9 w-auto max-w-[160px] object-contain" width="144" height="36" fetchpriority="high" />
          <template v-else>
            <span class="w-9 h-9 rounded-md bg-brand-600 flex items-center justify-center text-white text-base font-bold" aria-hidden="true">恒</span>
            <span class="flex flex-col leading-none">
              <span class="font-bold text-[17px] text-ink-900 tracking-wide">{{ COMPANY_SHORT }}</span>
              <span class="text-[10px] text-ink-500 tracking-[0.2em] mt-1">{{ COMPANY_EN }}</span>
            </span>
          </template>
        </RouterLink>

        <!-- 桌面导航 -->
        <nav class="hidden lg:flex items-stretch h-full flex-1" aria-label="主导航">
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
              class="nav-link"
              :class="{ 'is-active': isActive(item) }"
              :aria-current="isActive(item) ? 'page' : undefined"
              :aria-haspopup="item.children?.length ? 'true' : undefined"
              :aria-expanded="item.children?.length ? openKey === item.key : undefined"
            >
              {{ item.label }}
              <svg v-if="item.children?.length" class="w-3 h-3 transition-transform" :class="openKey === item.key ? 'rotate-180' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </RouterLink>

            <Transition name="dropdown">
              <div v-if="item.children?.length && openKey === item.key" class="dropdown-panel">
                <p class="dropdown-title">{{ item.label }}</p>
                <RouterLink
                  v-for="child in item.children"
                  :key="child.key"
                  :to="childTo(child)"
                  class="dropdown-link"
                >{{ child.label }}</RouterLink>
              </div>
            </Transition>
          </div>
        </nav>

        <MemberEntry class="hidden lg:flex mr-5 text-ink-700" />
        <a
          v-if="sitePhone"
          :href="`tel:${sitePhone}`"
          class="hidden lg:flex items-center gap-2 px-4 h-10 rounded-md bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors shrink-0 no-underline tabular-nums"
        >
          <PhoneIcon class="w-4 h-4" />
          {{ sitePhone }}
        </a>

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
import { COMPANY_EN, COMPANY_SHORT } from '@/config/brand'
import { useHeaderNav } from '@/composables/useHeaderNav'
import MemberEntry from './MemberEntry.vue'
import MobileNav from './MobileNav.vue'
import PhoneIcon from './PhoneIcon.vue'

const {
  menu, sitePhone, siteLogo, scrolled,
  menuOpen, openKey, expandedKey,
  isActive, childTo, openDropdown, scheduleClose, onFocusOut, onEscape, closeMobile,
} = useHeaderNav()
</script>

<style scoped>
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
