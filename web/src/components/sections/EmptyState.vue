<template>
  <!-- 空状态占位：板块数据为空时展示，保证页面结构完整不留白 -->
  <div class="flex flex-col items-center justify-center py-12" :class="onDark ? 'text-slate-500' : 'text-ink-400'">
    <svg class="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/>
    </svg>
    <p class="text-sm" :class="onDark ? 'text-slate-300' : 'text-ink-500'">{{ text }}</p>
    <slot />
  </div>
</template>

<script setup lang="ts">
// 统一空状态占位；默认插槽可放「重试」等操作
withDefaults(defineProps<{ text?: string; onDark?: boolean }>(), { text: '暂无内容', onDark: false })
</script>
