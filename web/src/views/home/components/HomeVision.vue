<template>
  <!-- 愿景使命：多轮自动轮播；无数据整块不渲染 -->
  <HomeBlock v-if="items.length" id="vision" eyebrow="愿景使命" :style2="style2" tone="dark">
    <BaseCarousel :items="items" label="愿景使命" :style2="style2" :interval="7000">
      <template #default="{ item }">
        <div class="hv-slide" :class="{ 'hv-slide--s2': style2 }">
          <h3 class="hv-title">{{ item.title }}</h3>
          <p v-if="item.desc" class="hv-desc">{{ item.desc }}</p>
        </div>
      </template>
    </BaseCarousel>
  </HomeBlock>
</template>

<script setup lang="ts">
// 首页愿景使命：每轮一条标题 + 说明，深色底大字号；说明为空则只显示标题
import type { VisionItem } from '@/api/home'
import BaseCarousel from '@/components/common/BaseCarousel.vue'
import HomeBlock from './HomeBlock.vue'

defineProps<{ items: VisionItem[]; style2?: boolean }>()
</script>

<style scoped>
/* 左右各留出箭头位，避免文字被轮播箭头压住 */
.hv-slide { padding: 8px 56px 16px; text-align: center; min-width: 0; }
.hv-slide--s2 { text-align: left; }
.hv-title { margin: 0 0 16px; font-size: clamp(24px, 3vw, 36px); font-weight: 700; line-height: 1.4; color: #fff; overflow-wrap: anywhere; }
.hv-desc { margin: 0 auto; max-width: 48rem; font-size: 16px; line-height: 1.9; color: rgba(255, 255, 255, 0.8); overflow-wrap: anywhere; }
.hv-slide--s2 .hv-desc { margin-left: 0; }
@media (max-width: 640px) {
  /* 窄屏箭头已隐藏，收回留白 */
  .hv-slide { padding: 8px 4px 16px; }
}
</style>
