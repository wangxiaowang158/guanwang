<template>
  <!-- 媒体采访与客户证言：单条直出、多条轮播；无数据整块不渲染 -->
  <HomeBlock v-if="items.length" id="testimony" eyebrow="媒体采访与客户证言" :style2="style2" tone="surface">
    <HomeTestimonyCard v-if="items.length === 1" :item="items[0]" :style2="style2" />
    <BaseCarousel v-else :items="items" label="媒体采访与客户证言" :style2="style2">
      <template #default="{ item }"><HomeTestimonyCard :item="item" :style2="style2" /></template>
    </BaseCarousel>
  </HomeBlock>
</template>

<script setup lang="ts">
// 首页媒体采访与客户证言：每条为「配图（可选）+ 证言」，证言渲染复用 TestimonialQuote 两套模板
import type { TestimonyItem } from '@/api/home'
import BaseCarousel from '@/components/common/BaseCarousel.vue'
import HomeBlock from './HomeBlock.vue'
import HomeTestimonyCard from './HomeTestimonyCard.vue'

defineProps<{ items: TestimonyItem[]; style2?: boolean }>()
</script>
