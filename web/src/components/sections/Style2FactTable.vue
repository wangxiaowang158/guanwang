<template>
  <!-- 样式二·案例基础信息：左右两栏表格行，名称列奶油底、取值列白底 -->
  <div v-if="items.length">
    <Style2SectionHead :heading="heading" :subheading="subheading" :on-dark="onDark" />
    <dl class="rs-ft-table" :class="{ 'rs-ft-table--dark': onDark }">
      <div v-for="(f, i) in items" :key="`${i}-${f.label}`" class="rs-ft-row">
        <dt class="rs-ft-label">{{ f.label }}</dt>
        <dd class="rs-ft-value">{{ f.value }}</dd>
      </div>
    </dl>
  </div>
</template>

<script setup lang="ts">
// 样式二案例基础信息：props 约定同 FactTable
import type { ExtraFact } from '@/api/page'
import Style2SectionHead from './Style2SectionHead.vue'

defineProps<{
  items: ExtraFact[]
  heading?: string
  subheading?: string
  onDark?: boolean
}>()
</script>

<style scoped>
/* 整表一张大圆角卡，行间细线分隔；不用顶部品牌色粗线 */
.rs-ft-table { margin: 0; overflow: hidden; background: var(--section-card, var(--rs-bg-cream)); border-radius: var(--radius-xl); }
.rs-ft-row { display: flex; }
.rs-ft-row + .rs-ft-row { border-top: 1px solid var(--rs-border); }
.rs-ft-label { flex: 0 0 9rem; margin: 0; padding: 20px 24px; font-size: 14px; color: var(--rs-text-muted); }
.rs-ft-value { flex: 1; min-width: 0; margin: 0; padding: 20px 24px; font-size: 17px; font-weight: 600; color: var(--rs-text-dark); }

.rs-ft-table--dark { background: var(--rs-bg-dark-soft); }
.rs-ft-table--dark .rs-ft-row + .rs-ft-row { border-color: var(--rs-border-dark); }
.rs-ft-table--dark .rs-ft-label { color: var(--rs-text-light-sub); }
.rs-ft-table--dark .rs-ft-value { color: #fff; }

@media (max-width: 480px) {
  .rs-ft-label { flex-basis: 6.5rem; padding: 14px 12px; }
  .rs-ft-value { padding: 14px 12px; }
}
</style>
