<template>
  <!-- 区块标题：苹果式大字主标题 + 灰色副标题，不加色条装饰；
       深色与背景图区块外层已套 .tone-dark，ink 语义色自动反白 -->
  <div class="mb-[var(--head-gap)]" :class="left ? 'text-left' : 'text-center'">
    <h2 class="text-fs-h2 font-bold leading-[1.15] text-ink-900">{{ heading }}</h2>
    <p v-if="subheading" class="text-fs-body-lg leading-relaxed max-w-2xl mt-4 text-ink-500" :class="left ? '' : 'mx-auto'">{{ subheading }}</p>
  </div>
</template>

<script setup lang="ts">
// 区块标题，纯展示组件；onDark 保留给调用方传参，颜色已由所在区块的色板决定
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
