<template>
  <!-- 单个业绩数字：进入视口时从 0 滚动到目标值 -->
  <div ref="elRef" class="text-center">
    <div
      class="text-3xl md:text-4xl font-bold mb-1"
      :class="accent ? '' : 'text-blue-600'"
      :style="accent ? { color: accent } : undefined"
    >
      {{ display }}<span class="text-2xl">{{ suffix }}</span>
    </div>
    <div class="text-sm text-gray-400">{{ label }}</div>
  </div>
</template>

<script setup lang="ts">
// 业绩数字滚动展示，复用 useCountUp composable
import { ref } from 'vue'
import { useCountUp } from '@/composables/useCountUp'

const props = defineProps<{
  value: number
  suffix: string
  label: string
  accent?: string // 数字颜色覆盖（样式二传入红色），不传用默认蓝色
}>()

const elRef = ref<HTMLElement>()
const { display } = useCountUp(elRef, props.value)
</script>
