<template>
  <!-- 首页联系我们：左侧联系方式、右侧在线留言（ContactSection 自带两套样式） -->
  <HomeBlock id="contact" :eyebrow="eyebrow" :title="title" :style2="style2" :tone="tone || (style2 ? 'surface' : 'white')">
    <ContactSection :site="site" />
  </HomeBlock>
</template>

<script setup lang="ts">
// 联系板块恒定渲染（留言表单是首页主要转化入口），只能在首页布局里关掉
import type { SiteInfo } from '@/api/home'
import ContactSection from './ContactSection.vue'
import HomeBlock from './HomeBlock.vue'

defineProps<{
  site: Partial<SiteInfo>
  style2?: boolean
  eyebrow?: string
  title?: string
  /** 留言表单直接压在底色上，只给白 / 浅色两种 */
  tone?: 'white' | 'surface'
}>()
</script>
