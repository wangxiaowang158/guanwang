<template>
  <!-- 404：地址不存在时停在原地址并给出去处，不再静默跳首页 -->
  <!-- 顶部留白让出固定顶栏（样式二 76px） -->
  <div class="bg-white">
    <div class="max-w-3xl mx-auto px-6 lg:px-8 pt-[160px] pb-24 md:pb-32 text-center">
      <p class="text-7xl md:text-8xl font-bold text-brand-100 leading-none tabular-nums" aria-hidden="true">404</p>
      <h1 class="text-2xl md:text-3xl font-bold text-ink-900 mt-6">页面不存在</h1>
      <p class="text-[15px] text-ink-500 mt-3">
        您访问的地址可能已调整或输入有误。
      </p>

      <!-- 给出主要栏目入口，避免用户只能退回浏览器后退 -->
      <nav class="flex items-center justify-center gap-x-6 gap-y-2 flex-wrap mt-8" aria-label="主要栏目">
        <RouterLink
          v-for="item in quickLinks"
          :key="item.path"
          :to="item.path"
          class="text-sm text-blue-600 hover:text-blue-700 transition-colors no-underline"
        >{{ item.label }}</RouterLink>
      </nav>

      <RouterLink
        to="/"
        class="inline-flex items-center justify-center mt-10 px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors no-underline"
      >返回首页</RouterLink>
    </div>
  </div>
</template>

<script setup lang="ts">
// 404 页：承接所有未匹配地址
// 不做 noindex 处理——那由路由 meta.noindex 驱动 useSeo 统一输出，见 router/index.ts
import { computed } from 'vue'
import { useSiteStore } from '@/stores/site'

const siteStore = useSiteStore()

/**
 * 快捷入口取后台配置的一级栏目
 * 取前 5 条：全列出来会把页面重心从"回首页"上带走；
 * 菜单尚未到达时为空数组，模板自然不渲染这一行
 */
const quickLinks = computed(() =>
  siteStore.menu.slice(0, 5).map((item) => ({ label: item.label, path: item.path }))
)
</script>
