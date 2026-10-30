<template>
  <!-- 单个业绩数字：进入视口时从 0 递增到目标值 -->
  <div ref="elRef" class="text-center">
    <div
      class="text-4xl md:text-5xl font-bold mb-2 tabular-nums tracking-tight"
      :class="accent ? '' : onDark ? 'text-white' : 'text-ink-900'"
      :style="accent ? { color: accent } : undefined"
    >
      {{ display }}<span class="text-2xl ml-0.5 tracking-normal" :class="onDark ? 'text-white/70' : 'text-ink-500'">{{ suffix }}</span>
    </div>
    <div class="text-sm" :class="onDark ? 'text-[#a1a1a6]' : 'text-ink-500'">{{ label }}</div>
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
  /** 数字颜色覆盖，不传时按底色取主文字色或白色 */
  accent?: string
  /** 深色底板块 */
  onDark?: boolean
}>()

const elRef = ref<HTMLElement>()
const { display } = useCountUp(elRef, props.value)
</script>
