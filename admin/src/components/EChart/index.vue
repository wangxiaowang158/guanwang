<template>
  <div ref="el" class="echart" :style="{ height }"></div>
</template>

<script setup lang="ts">
// echarts 通用封装：传入 option 自动渲染，监听容器尺寸自适应
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import * as echarts from 'echarts'

const props = withDefaults(defineProps<{
  option: echarts.EChartsOption
  height?: string
}>(), {
  height: '320px'
})

const el = ref<HTMLDivElement>()
let chart: echarts.ECharts | null = null

const resize = () => chart?.resize()

onMounted(() => {
  if (!el.value) return
  chart = echarts.init(el.value)
  chart.setOption(props.option)
  window.addEventListener('resize', resize)
})

// option 变化时全量更新（notMerge 避免残留旧系列）
watch(() => props.option, (opt) => {
  chart?.setOption(opt, true)
}, { deep: true })

onBeforeUnmount(() => {
  window.removeEventListener('resize', resize)
  chart?.dispose()
  chart = null
})
</script>

<style scoped>
.echart {
  width: 100%;
}
</style>
