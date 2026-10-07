<template>
  <!-- 首页按当前模板分发：样式一（深蓝科技风）/ 样式二（集团品牌风） -->
  <component :is="homeComp" />
</template>

<script setup lang="ts">
// 两套首页按需异步加载：访客只会用到其中一套，合计近千行不必都进首屏包
import { computed, defineAsyncComponent } from 'vue'
import { useThemeStore } from '@/stores/theme'

defineOptions({ name: 'HomePage' })

const Style1Home = defineAsyncComponent(() => import('./Style1Home.vue'))
const Style2Home = defineAsyncComponent(() => import('./Style2Home.vue'))

const theme = useThemeStore()
const homeComp = computed(() => (theme.isStyle2 ? Style2Home : Style1Home))
</script>
