<template>
  <!-- 区块标题：主标题 + 品牌色短条 + 副标题；onDark 时切换浅色文字（用于背景图区块） -->
  <div class="mb-[var(--head-gap)]" :class="left ? 'text-left' : 'text-center'">
    <h2 class="text-fs-h2 font-bold leading-tight" :class="onDark ? 'text-white' : 'text-ink-900'">{{ heading }}</h2>
    <span class="block w-10 h-[3px] mt-4 rounded-full" :class="[onDark ? 'bg-accent' : 'bg-brand-600', left ? '' : 'mx-auto']" aria-hidden="true"></span>
    <p v-if="subheading" class="text-fs-body leading-relaxed max-w-2xl mt-4" :class="[onDark ? 'text-slate-200' : 'text-ink-500', left ? '' : 'mx-auto']">{{ subheading }}</p>
  </div>
</template>

<script setup lang="ts">
// 区块标题，纯展示组件；onDark 用于深色/背景图区块上的浅色文字
import { computed } from 'vue'

const props = defineProps<{
  heading: string
  subheading?: string
  onDark?: boolean
  /** 对齐方式，后台「区块外观」配置；缺省居中 */
  align?: 'center' | 'left'
}>()

const left = computed(() => props.align === 'left')
</script>
