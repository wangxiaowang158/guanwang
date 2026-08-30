<template>
  <!-- 首页按当前模板分发：样式一（深蓝科技风）/ 样式二（集团品牌风） -->
  <component :is="homeComp" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useThemeStore } from '@/stores/theme'
import Style1Home from './Style1Home.vue'
import Style2Home from './Style2Home.vue'

const theme = useThemeStore()
const homeComp = computed(() => (theme.isStyle2 ? Style2Home : Style1Home))
</script>
