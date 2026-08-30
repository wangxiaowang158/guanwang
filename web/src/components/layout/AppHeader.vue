<template>
  <!-- 固定顶栏：中瑞恒品牌 + 数据驱动主导航（含下拉子菜单）+ 联系电话 -->
  <header
    class="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
    :class="scrolled ? 'bg-white/85 backdrop-blur-xl shadow-sm' : 'bg-white/40 backdrop-blur-sm'"
  >
    <div class="max-w-7xl mx-auto px-6 lg:px-8">
      <div class="flex items-center justify-between h-16">
        <!-- Logo -->
        <RouterLink to="/" class="flex items-center gap-2.5 no-underline shrink-0 mr-6">
          <div class="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white text-base font-bold">Z</div>
          <div class="flex flex-col leading-none">
            <span class="font-bold text-base text-gray-900">中瑞恒</span>
            <span class="text-[10px] text-gray-400 tracking-[0.2em] mt-0.5">ZRUIHENG</span>
          </div>
        </RouterLink>

        <!-- 桌面导航 -->
        <nav class="hidden lg:flex items-center">
          <div
            v-for="item in menu"
            :key="item.key"
            class="relative"
            @mouseenter="openKey = item.key"
            @mouseleave="openKey = ''"
          >
            <RouterLink
              :to="item.path"
              class="flex items-center gap-1 px-3.5 py-5 text-sm text-gray-600 hover:text-blue-600 transition-colors no-underline whitespace-nowrap"
              :class="{ 'text-blue-600 font-medium': isActive(item) }"
            >
              {{ item.label }}
              <svg v-if="item.children?.length" class="w-3 h-3 text-gray-400 transition-transform" :class="openKey === item.key ? 'rotate-180' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </RouterLink>

            <!-- 下拉子菜单 -->
            <Transition name="dropdown">
              <div
                v-if="item.children?.length && openKey === item.key"
                class="absolute left-0 top-full min-w-44 bg-white rounded-xl border border-gray-100 shadow-lg py-2"
              >
                <RouterLink
                  v-for="child in item.children"
                  :key="child.key"
                  :to="childTo(child)"
                  class="block px-4 py-2 text-sm text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition-colors no-underline whitespace-nowrap"
                  @click="openKey = ''"
                >{{ child.label }}</RouterLink>
              </div>
            </Transition>
          </div>
        </nav>

        <!-- 会员入口 + 联系电话 CTA -->
        <MemberEntry class="hidden lg:flex mr-4 text-gray-600" />
        <a
          :href="`tel:${sitePhone}`"
          class="hidden lg:flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors shrink-0 no-underline"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
          </svg>
          {{ sitePhone }}
        </a>

        <!-- 移动端汉堡按钮 -->
        <button class="lg:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-50 transition-all" :aria-label="menuOpen ? '关闭菜单' : '打开菜单'" @click="menuOpen = !menuOpen">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path v-if="!menuOpen" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
            <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
    <!-- 移动端抽屉菜单 -->
    <Transition name="drawer">
      <div v-if="menuOpen" class="lg:hidden border-t border-gray-100 bg-white px-4 py-3 max-h-[80vh] overflow-y-auto">
        <div v-for="item in menu" :key="item.key" class="border-b border-gray-50 last:border-0">
          <div class="flex items-center justify-between">
            <RouterLink
              :to="item.path"
              class="flex-1 px-3 py-3 text-sm text-gray-700 no-underline"
              :class="{ 'text-blue-600 font-medium': isActive(item) }"
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
              class="block pl-6 pr-3 py-2.5 text-sm text-gray-500 hover:text-blue-600 no-underline"
              @click="closeMobile"
            >{{ child.label }}</RouterLink>
          </div>
        </div>
        <MemberEntry class="mt-3 justify-center py-2 text-gray-600" />
        <a :href="`tel:${sitePhone}`" class="flex items-center justify-center gap-2 mt-3 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium no-underline">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
          </svg>
          {{ sitePhone }}
        </a>
      </div>
    </Transition>
  </header>
</template>
<script setup lang="ts">
// 顶栏：数据驱动主导航 + 桌面下拉 / 移动抽屉 + 滚动毛玻璃
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
const menuOpen = ref(false)   // 移动端抽屉开关
const openKey = ref('')       // 桌面端当前展开的下拉
const expandedKey = ref('')   // 移动端当前展开的子菜单

// 从 App.vue 注入的滚动位置，驱动顶栏毛玻璃实底
const scrollY = inject<Ref<number>>('scrollY')
if (scrollY) watch(scrollY, (v) => { scrolled.value = v > 20 })

// 一级栏目是否激活（含子页同 path 的情况）
const isActive = (item: MenuNode) => route.path === item.path
// 子项跳转地址：同页锚点用 hash，否则直接 path
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
.dropdown-enter-active,
.dropdown-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}
.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
.drawer-enter-active,
.drawer-leave-active {
  transition: opacity 0.22s ease, transform 0.22s ease;
}
.drawer-enter-from,
.drawer-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>