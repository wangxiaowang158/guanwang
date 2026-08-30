<template>
  <!-- 样式二顶栏：集团品牌风，初始透明叠加大图，滚动后白底，红色点缀 -->
  <header
    class="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
    :class="scrolled ? 'bg-white shadow-[0_1px_0_rgba(0,0,0,0.06)]' : 'bg-transparent'"
  >
    <div class="mx-auto px-6 lg:px-10" style="max-width: var(--rs-content-max)">
      <div class="flex items-center justify-between" style="height: 76px">
        <!-- Logo -->
        <RouterLink to="/" class="flex items-center gap-3 no-underline shrink-0">
          <div
            class="w-10 h-10 flex items-center justify-center text-white text-lg font-bold"
            style="background: var(--rs-primary)"
          >Z</div>
          <div class="flex flex-col leading-none">
            <span class="font-bold text-lg" :class="textColor">中瑞恒集团</span>
            <span class="text-[10px] tracking-[0.25em] mt-1" :class="subColor">ZRUIHENG GROUP</span>
          </div>
        </RouterLink>

        <!-- 桌面导航 -->
        <nav class="hidden lg:flex items-center gap-1">
          <div
            v-for="item in menu"
            :key="item.key"
            class="relative"
            @mouseenter="openKey = item.key"
            @mouseleave="openKey = ''"
          >
            <RouterLink
              :to="item.path"
              class="flex items-center gap-1 px-4 text-sm font-medium transition-colors no-underline whitespace-nowrap rs-nav-link"
              :class="[textColor, { 'is-active': isActive(item) }]"
              style="height: 76px; line-height: 76px"
            >
              {{ item.label }}
            </RouterLink>

            <!-- 下拉子菜单 -->
            <Transition name="rs-dropdown">
              <div
                v-if="item.children?.length && openKey === item.key"
                class="absolute left-0 top-full min-w-44 bg-white shadow-xl py-2 border-t-2"
                style="border-color: var(--rs-primary)"
              >
                <RouterLink
                  v-for="child in item.children"
                  :key="child.key"
                  :to="childTo(child)"
                  class="block px-5 py-2.5 text-sm text-gray-600 hover:text-white transition-colors no-underline whitespace-nowrap rs-dropdown-link"
                  @click="openKey = ''"
                >{{ child.label }}</RouterLink>
              </div>
            </Transition>
          </div>
        </nav>
        <div class="flex items-center gap-4 shrink-0">
          <MemberEntry class="hidden lg:flex" :class="textColor" />
          <a
            :href="`tel:${sitePhone}`"
            class="hidden lg:flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white transition-colors no-underline"
            style="background: var(--rs-primary)"
            @mouseenter="(e) => ((e.currentTarget as HTMLElement).style.background = 'var(--rs-primary-dark)')"
            @mouseleave="(e) => ((e.currentTarget as HTMLElement).style.background = 'var(--rs-primary)')"
          >{{ sitePhone }}</a>

          <!-- 移动端汉堡按钮 -->
          <button
            class="lg:hidden p-2"
            :class="textColor"
            :aria-label="menuOpen ? '关闭菜单' : '打开菜单'"
            @click="menuOpen = !menuOpen"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path v-if="!menuOpen" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
              <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
    <Transition name="rs-drawer">
      <div v-if="menuOpen" class="lg:hidden bg-white border-t border-gray-100 px-4 py-3 max-h-[80vh] overflow-y-auto">
        <div v-for="item in menu" :key="item.key" class="border-b border-gray-50 last:border-0">
          <div class="flex items-center justify-between">
            <RouterLink
              :to="item.path"
              class="flex-1 px-3 py-3 text-sm text-gray-700 no-underline"
              :class="{ 'font-semibold': isActive(item) }"
              :style="isActive(item) ? 'color: var(--rs-primary)' : ''"
              @click="closeMobile"
            >{{ item.label }}</RouterLink>
            <button
              v-if="item.children?.length"
              class="p-3 text-gray-400"
              :aria-label="expandedKey === item.key ? '收起' : '展开'"
              @click="expandedKey = expandedKey === item.key ? '' : item.key"
            >
              <svg class="w-4 h-4 transition-transform" :class="expandedKey === item.key ? 'rotate-180' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
          <div v-if="item.children?.length && expandedKey === item.key" class="pb-2">
            <RouterLink
              v-for="child in item.children"
              :key="child.key"
              :to="childTo(child)"
              class="block pl-6 pr-3 py-2.5 text-sm text-gray-500 no-underline"
              @click="closeMobile"
            >{{ child.label }}</RouterLink>
          </div>
        </div>
        <MemberEntry class="mt-3 justify-center py-2 text-gray-600" />
        <a :href="`tel:${sitePhone}`" class="flex items-center justify-center gap-2 mt-3 py-2.5 text-white text-sm font-medium no-underline" style="background: var(--rs-primary)">
          {{ sitePhone }}
        </a>
      </div>
    </Transition>
  </header>
</template>
<script setup lang="ts">
// 样式二顶栏：集团品牌风，滚动切换透明/白底，红色点缀
import { ref, inject, watch, onMounted, computed } from 'vue'
import type { Ref } from 'vue'
import { useRoute } from 'vue-router'
import type { MenuNode } from '@/api/menu'
import { useSiteStore } from '@/stores/site'
import MemberEntry from './MemberEntry.vue'

const route = useRoute()
const siteStore = useSiteStore()
// 菜单与电话取自 site store，多组件共享同一次请求
const menu = computed<MenuNode[]>(() => siteStore.menu)
const sitePhone = computed(() => siteStore.site.phone || '010-53608607')
const scrolled = ref(false)
const menuOpen = ref(false)
const openKey = ref('')
const expandedKey = ref('')

// 顶栏文字色：叠加浅色 Hero / 白底均用深色，固定常量
const textColor = 'text-gray-900'
const subColor = 'text-gray-400'

const scrollY = inject<Ref<number>>('scrollY')
if (scrollY) watch(scrollY, (v) => { scrolled.value = v > 20 })

const isActive = (item: MenuNode) => route.path === item.path
const childTo = (child: MenuNode) => (child.anchor ? `${child.path}#${child.anchor}` : child.path)

function closeMobile() {
  menuOpen.value = false
  expandedKey.value = ''
}

onMounted(() => {
  // store 内部已做去重，重复调用不会产生额外请求
  siteStore.fetchMenu()
  siteStore.fetchSite()
})
</script>

<style scoped>
/* 导航项激活/悬停红色下划线 */
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
  color: var(--rs-primary) !important;
}
.rs-dropdown-link:hover {
  background: var(--rs-primary);
}
.rs-dropdown-enter-active,
.rs-dropdown-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}
.rs-dropdown-enter-from,
.rs-dropdown-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
.rs-drawer-enter-active,
.rs-drawer-leave-active {
  transition: opacity 0.22s ease, transform 0.22s ease;
}
.rs-drawer-enter-from,
.rs-drawer-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
