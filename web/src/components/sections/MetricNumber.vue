<template>
  <!-- 指标数值：纯数字进入视口时滚动到目标值，非数字（如「≥30」「一年内」）原样展示 -->
  <span ref="elRef" class="tabular-nums">{{ shown }}</span>
</template>

<script setup lang="ts">
// 指标数值滚动展示，复用 useCountUp；数据变化时由调用方用 :key 重建本组件
import { computed, ref } from 'vue'
import { useCountUp } from '@/composables/useCountUp'

const props = defineProps<{ value: string }>()

/** 纯数字（可带千分位逗号与最多两位小数）才滚动 */
const NUMERIC = /^\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?$|^\d+(?:\.\d{1,2})?$/

// 转成字符串再判断：脏数据里 value 可能是 number，直接 trim 会抛错
const plain = String(props.value ?? '').trim()
const numeric = NUMERIC.test(plain)
const decimals = numeric && plain.includes('.') ? plain.split('.')[1].length : 0
const hasComma = numeric && plain.includes(',')
// useCountUp 按整数取整，小数放大 10^n 倍滚动、展示时再还原
const scale = 10 ** decimals
const target = numeric ? Math.round(Number(plain.replace(/,/g, '')) * scale) : 0

const elRef = ref<HTMLElement>()
const { display } = useCountUp(elRef, target)

const shown = computed(() => {
  if (!numeric) return props.value
  const n = display.value / scale
  return n.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: hasComma,
  })
})
</script>
