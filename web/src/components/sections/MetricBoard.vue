<template>
  <!-- 样式一·量化价值看板：大号数值 + 单位 + 指标名 + 备注 -->
  <div v-if="items.length">
    <SectionHeading v-if="heading" :heading="heading" :subheading="subheading" :on-dark="onDark" />
    <dl class="mb-board">
      <!-- dt 在前、dd 在后才是合法的 dl 名值结构；视觉上数值在上，由 column-reverse 反转 -->
      <div v-for="m in items" :key="`${m.label}-${m.value}`" class="mb-item" :class="{ 'mb-item--dark': onDark }">
        <dt class="mb-label">{{ m.label }}</dt>
        <dd class="mb-value">
          <MetricNumber :value="m.value" />
          <span v-if="m.unit" class="mb-unit">{{ m.unit }}</span>
        </dd>
        <dd v-if="m.note" class="mb-note">{{ m.note }}</dd>
      </div>
    </dl>
  </div>
</template>

<script setup lang="ts">
// 量化价值/数据看板：只接收 extra.metrics，数值滚动见 MetricNumber
import type { ExtraMetric } from '@/api/page'
import MetricNumber from './MetricNumber.vue'
import SectionHeading from './SectionHeading.vue'

defineProps<{
  items: ExtraMetric[]
  heading?: string
  subheading?: string
  onDark?: boolean
}>()
</script>

<style scoped>
.mb-board {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin: 0;
}
.mb-item {
  display: flex;
  flex-direction: column;
  padding: 28px 20px;
  text-align: center;
  background: #fff;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-lg);
}
.mb-value { order: -1; margin: 0 0 8px; font-size: clamp(32px, 3.4vw, 44px); font-weight: 700; line-height: 1.1; letter-spacing: -0.01em; color: var(--color-brand-600); }
.mb-unit { margin-left: 4px; font-size: 18px; font-weight: 600; }
.mb-label { font-size: 15px; font-weight: 500; color: var(--color-ink-900); }
.mb-note { margin: 6px 0 0; font-size: 13px; line-height: 1.6; color: var(--color-ink-500); }

/* 背景图区块：卡片改半透明白，数值与文字提亮 */
.mb-item--dark { background: rgba(255, 255, 255, 0.1); border-color: rgba(255, 255, 255, 0.3); }
.mb-item--dark .mb-value { color: #fff; }
.mb-item--dark .mb-label { color: #fff; }
.mb-item--dark .mb-note { color: var(--color-ink-400); }
</style>
