<template>
  <!-- 样式一·全链条流程：编号步骤依次排布，宽屏多列、窄屏单列 -->
  <div v-if="items.length">
    <SectionHeading v-if="heading" :heading="heading" :subheading="subheading" :on-dark="onDark" />
    <ol class="pf-list">
      <li v-for="(s, i) in items" :key="i" class="pf-item">
        <span class="pf-num" aria-hidden="true">{{ i + 1 }}</span>
        <h3 class="pf-title"><span class="sr-only">第 {{ i + 1 }} 步：</span>{{ s.title }}</h3>
        <p v-if="s.desc" class="pf-desc">{{ s.desc }}</p>
      </li>
    </ol>
  </div>
</template>

<script setup lang="ts">
// 全链条流程：只接收 extra.steps，数据由页面从条目 extra 取出后传入
import type { ExtraItem } from '@/api/page'
import SectionHeading from './SectionHeading.vue'

defineProps<{
  items: ExtraItem[]
  heading?: string
  subheading?: string
  onDark?: boolean
}>()
</script>

<style scoped>
.pf-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.pf-item {
  position: relative;
  padding: 28px;
  /* 无描边无顶部色条：底色与区块错开分层 */
  background: var(--section-card, var(--color-surface));
  border-radius: var(--radius-xl);
}
/* 步骤号：大号品牌蓝数字，不用实心圆底 */
.pf-num {
  display: block;
  margin-bottom: 16px;
  font-size: 32px;
  font-weight: 700;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  color: var(--color-brand-600);
}
.pf-title { margin: 0 0 8px; font-size: var(--text-fs-h4); font-weight: 700; line-height: 1.35; color: var(--color-ink-900); }
.pf-desc { margin: 0; font-size: 14px; line-height: 1.75; color: var(--color-ink-500); }
</style>
