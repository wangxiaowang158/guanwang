<template>
  <!-- 右侧固定快捷操作：电话 / 微信（二维码已配置才显示）/ 回到顶部 -->
  <div class="fixed right-4 bottom-24 z-40 flex flex-col gap-2">
    <!-- 电话 -->
    <a
      v-if="site.phone"
      :href="`tel:${site.phone}`"
      class="group relative w-11 h-11 rounded-xl bg-white border border-gray-100 shadow-md flex items-center justify-center text-gray-500 hover:text-blue-600 hover:border-blue-100 transition-all no-underline"
      aria-label="联系电话"
    >
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
      </svg>
      <span class="absolute right-full mr-2 px-2.5 py-1 rounded-lg bg-gray-900 text-white text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">{{ site.phone }}</span>
    </a>

    <!-- 微信（仅在二维码已配置时显示） -->
    <div
      v-if="site.wechatQr"
      class="group relative w-11 h-11 rounded-xl bg-white border border-gray-100 shadow-md flex items-center justify-center text-gray-500 hover:text-green-600 hover:border-green-100 transition-all cursor-pointer"
      aria-label="微信咨询"
    >
      <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 01.213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 00.167-.054l1.903-1.114a.864.864 0 01.717-.098 10.16 10.16 0 002.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-3.898-6.348-7.596-6.348z" />
      </svg>
      <div class="absolute right-full mr-2 p-2 rounded-xl bg-white border border-gray-100 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        <img :src="site.wechatQr" alt="微信二维码" class="w-28 h-28 object-cover rounded-lg" width="112" height="112" />
      </div>
    </div>

    <!-- 回到顶部（滚动超过一屏才显示） -->
    <Transition name="fade">
      <button
        v-if="showTop"
        class="w-11 h-11 rounded-xl bg-blue-600 shadow-md flex items-center justify-center text-white hover:bg-blue-700 transition-colors"
        aria-label="回到顶部"
        @click="scrollTop"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
        </svg>
      </button>
    </Transition>
  </div>
</template>
<script setup lang="ts">
// 右侧快捷操作：电话/微信/回到顶部；微信二维码未配置时不显示
import { computed, inject, onMounted } from 'vue'
import type { Ref } from 'vue'
import { useSiteStore } from '@/stores/site'

const siteStore = useSiteStore()
// 站点信息取自 site store，多组件共享同一次请求
const site = computed(() => siteStore.site)

// 注入 App.vue 提供的滚动位置与回顶方法（页面用 el-scrollbar 承载滚动）
const scrollY = inject<Ref<number>>('scrollY')
const scrollToTop = inject<() => void>('scrollToTop')

const showTop = computed(() => (scrollY?.value ?? 0) > 600)

function scrollTop() {
  scrollToTop?.()
}

onMounted(() => {
  // store 内部已做去重，重复调用不会产生额外请求
  siteStore.fetchSite()
})
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>