<template>
  <!-- 样式二·量化价值看板：直角分格，红色大号数值左对齐 -->
  <div v-if="items.length">
    <Style2SectionHead :heading="heading" :subheading="subheading" :on-dark="onDark" />
    <dl class="rs-mb-board" :class="{ 'rs-mb-board--dark': onDark }">
      <div v-for="m in items" :key="`${m.label}-${m.value}`" class="rs-mb-item">
        <dt class="rs-mb-label">{{ m.label }}</dt>
        <dd class="rs-mb-value">
          <MetricNumber :value="m.value" />
          <span v-if="m.unit" class="rs-mb-unit">{{ m.unit }}</span>
        </dd>
        <dd v-if="m.note" class="rs-mb-note">{{ m.note }}</dd>
      </div>
    </dl>
  </div>
</template>

<script setup lang="ts">
// 样式二量化价值看板：props 约定同 MetricBoard
import type { ExtraMetric } from '@/api/page'
import MetricNumber from './MetricNumber.vue'
import Style2SectionHead from './Style2SectionHead.vue'

defineProps<{
  items: ExtraMetric[]
  heading?: string
  subheading?: string
  onDark?: boolean
}>()
</script>

<style scoped>
/* 独立大圆角卡片网格，无描边；底色与区块错开分层 */
.rs-mb-board {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 20px;
  margin: 0;
}
.rs-mb-item { display: flex; flex-direction: column; padding: 36px 28px; background: var(--section-card, var(--rs-bg-cream)); border-radius: var(--radius-xl); }
/* 苹果式数据：超大深色数字，数字本身是视觉重点；800 字重苹方会被合成发糊，取 700 */
.rs-mb-value { order: -1; margin: 0 0 10px; font-size: clamp(40px, 4.6vw, 64px); font-weight: 700; line-height: 1.05; color: var(--rs-text-dark); }
.rs-mb-unit { margin-left: 4px; font-size: 20px; font-weight: 600; }
.rs-mb-label { font-size: 15px; font-weight: 600; color: var(--rs-text-dark); }
.rs-mb-note { margin: 6px 0 0; font-size: 13px; line-height: 1.6; color: var(--rs-text-muted); }

/* 背景图区块：分隔线与底色改深，避免白格压在图片上过于突兀 */
.rs-mb-board--dark .rs-mb-item { background: var(--rs-bg-dark-soft); }
.rs-mb-board--dark .rs-mb-value { color: #fff; }
.rs-mb-board--dark .rs-mb-label { color: #fff; }
.rs-mb-board--dark .rs-mb-note { color: var(--rs-text-light-sub); }
</style>
