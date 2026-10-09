<template>
  <!-- 样式一·案例基础信息：键值对网格，名称在上、取值在下 -->
  <div v-if="items.length">
    <SectionHeading v-if="heading" :heading="heading" :subheading="subheading" :on-dark="onDark" />
    <dl class="ft-grid" :class="{ 'ft-grid--dark': onDark }">
      <div v-for="(f, i) in items" :key="`${i}-${f.label}`" class="ft-cell">
        <dt class="ft-label">{{ f.label }}</dt>
        <dd class="ft-value">{{ f.value }}</dd>
      </div>
    </dl>
  </div>
</template>

<script setup lang="ts">
// 案例基础信息：只接收 extra.facts（面积、业态、合作模式等键值对）
import type { ExtraFact } from '@/api/page'
import SectionHeading from './SectionHeading.vue'

defineProps<{
  items: ExtraFact[]
  heading?: string
  subheading?: string
  onDark?: boolean
}>()
</script>

<style scoped>
.ft-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1px;
  margin: 0;
  overflow: hidden;
  background: var(--color-line);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-lg);
}
.ft-cell { padding: 20px 24px; background: #fff; }
.ft-label { margin-bottom: 6px; font-size: 13px; color: var(--color-ink-500); }
.ft-value { margin: 0; font-size: var(--text-fs-body-lg); font-weight: 600; line-height: 1.5; color: var(--color-ink-900); }

.ft-grid--dark { background: rgba(255, 255, 255, 0.3); border-color: rgba(255, 255, 255, 0.3); }
.ft-grid--dark .ft-cell { background: rgba(15, 23, 42, 0.55); }
.ft-grid--dark .ft-label { color: var(--color-ink-400); }
.ft-grid--dark .ft-value { color: #fff; }
</style>
