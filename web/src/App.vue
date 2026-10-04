<template>
  <!-- 模板风格确定前不渲染页面：否则会先按样式一挂载再切样式二，
       首页接口与访问埋点各发两次，页面也会闪一下 -->
  <RouterView v-if="theme.loaded" />
</template>

<script setup lang="ts">
// 根组件：确定模板风格后再渲染页面，并在此输出页面 SEO 信息
// SEO 挂在根组件才能覆盖官网壳之外的会员认证页
// 整页滚动交给原生窗口（不再用 el-scrollbar 容器）：移动端地址栏可随滚动收起，
// 键盘 PageDown/空格无需先聚焦容器，锚点与滚动恢复由路由 scrollBehavior 统一处理
import { onMounted } from 'vue'
import { useThemeStore } from '@/stores/theme'
import { useSeo } from '@/composables/useSeo'
import { useSiteJsonLd } from '@/composables/useJsonLd'

// 页面标题与搜索引擎信息：栏目页取后台栏目配置，其余页取路由标题
useSeo()
// 站点级结构化数据：搜索结果里的企业信息卡靠它生成
useSiteJsonLd()

const theme = useThemeStore()
onMounted(() => { theme.loadTheme() })
</script>
