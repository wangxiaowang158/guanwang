<template>
  <el-scrollbar ref="scrollbarRef" height="100vh" @scroll="onScroll">
    <RouterView />
  </el-scrollbar>
</template>

<script setup lang="ts">
// 根容器：用 el-scrollbar 承载整页滚动，向子组件提供滚动位置与回顶/锚点定位能力
import { ref, provide, watch, nextTick, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import type { ScrollbarInstance } from 'element-plus'
import { useThemeStore } from '@/stores/theme'

const route = useRoute()
const scrollbarRef = ref<ScrollbarInstance>()
const scrollY = ref(0)
provide('scrollY', scrollY)

// 初始化时确定当前模板，供全站布局/页面解析
const theme = useThemeStore()
onMounted(() => { theme.loadTheme() })

function onScroll({ scrollTop }: { scrollTop: number }) {
  scrollY.value = scrollTop
}

// 平滑滚动到顶部
function scrollToTop() {
  scrollbarRef.value?.setScrollTop(0)
}
provide('scrollToTop', scrollToTop)

// 滚动到指定锚点元素，补偿固定顶栏高度；元素未渲染时按帧重试（栏目页异步加载）
function scrollToAnchor(hash: string, retries = 30) {
  const el = document.getElementById(hash.slice(1))
  const wrap = scrollbarRef.value?.wrapRef
  if (!el || !wrap) {
    if (retries > 0) requestAnimationFrame(() => scrollToAnchor(hash, retries - 1))
    return
  }
  const navHeight = 64
  const top = el.getBoundingClientRect().top - wrap.getBoundingClientRect().top + wrap.scrollTop - navHeight
  scrollbarRef.value?.setScrollTop(top)
}
provide('scrollToAnchor', scrollToAnchor)

// 路由变化：有 hash 则定位锚点（自带重试），否则回到顶部
watch(
  () => route.fullPath,
  async () => {
    await nextTick()
    if (route.hash) scrollToAnchor(route.hash)
    else scrollToTop()
  }
)
</script>
