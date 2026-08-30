<template>
  <!-- 板块标题区：居中眉标 + 主标题 + 副标题；onDark 时切换浅色文字（用于背景图板块） -->
  <div class="text-center mb-12">
    <h2 class="text-2xl md:text-3xl font-bold mb-3" :class="onDark ? 'text-white' : 'text-gray-900'">{{ heading }}</h2>
    <p v-if="subheading" class="text-sm max-w-2xl mx-auto" :class="onDark ? 'text-gray-200' : 'text-gray-400'">{{ subheading }}</p>
  </div>
</template>

<script setup lang="ts">
// 板块标题，纯展示组件；onDark 用于深色/背景图板块上的浅色文字
defineProps<{
  heading: string
  subheading?: string
  onDark?: boolean
}>()
</script>
