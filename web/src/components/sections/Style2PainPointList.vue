<template>
  <!-- 样式二·痛点方案：直角分格，三段依次为痛点、解决方案、量化价值（红字强调） -->
  <div v-if="items.length">
    <Style2SectionHead :heading="heading" :subheading="subheading" :on-dark="onDark" />
    <ol class="rs-pp-list">
      <li v-for="(p, i) in items" :key="i" class="rs-pp-row">
        <div class="rs-pp-cell">
          <span class="rs-pp-index" aria-hidden="true">{{ String(i + 1).padStart(2, '0') }}</span>
          <p class="rs-pp-tag">痛点</p>
          <h3 class="rs-pp-title">{{ p.title }}</h3>
          <p v-if="p.desc" class="rs-pp-text">{{ p.desc }}</p>
        </div>
        <div v-if="p.solution" class="rs-pp-cell rs-pp-cell--solution">
          <p class="rs-pp-tag">解决方案</p>
          <p class="rs-pp-text rs-pp-text--strong">{{ p.solution }}</p>
        </div>
        <div v-if="p.value" class="rs-pp-cell">
          <p class="rs-pp-tag">量化价值</p>
          <p class="rs-pp-value">{{ p.value }}</p>
        </div>
      </li>
    </ol>
  </div>
</template>

<script setup lang="ts">
// 样式二痛点方案列表：props 约定同 PainPointList
import type { ExtraPain } from '@/api/page'
import Style2SectionHead from './Style2SectionHead.vue'

defineProps<{
  items: ExtraPain[]
  heading?: string
  subheading?: string
  onDark?: boolean
}>()
</script>

<style scoped>
.rs-pp-list { display: flex; flex-direction: column; gap: 1px; margin: 0; padding: 0; list-style: none; background: var(--rs-border); }
.rs-pp-row { display: flex; gap: 1px; background: var(--rs-border); }
.rs-pp-cell { position: relative; flex: 1 1 0; min-width: 0; padding: 28px; background: #fff; }
.rs-pp-cell--solution { background: var(--rs-bg-cream); }
.rs-pp-index { position: absolute; top: 20px; right: 24px; font-size: 24px; font-weight: 800; color: var(--rs-primary); opacity: 0.2; }
.rs-pp-tag { margin: 0 0 10px; font-size: 12px; font-weight: 600; letter-spacing: 0.08em; color: var(--rs-text-muted); }
.rs-pp-title { margin: 0 0 8px; font-size: 16px; font-weight: 700; color: var(--rs-text-dark); }
.rs-pp-text { margin: 0; font-size: 14px; line-height: 1.75; color: var(--rs-text-body); }
.rs-pp-text--strong { font-size: 15px; color: var(--rs-text-dark); }
.rs-pp-value { margin: 0; font-size: 20px; font-weight: 700; line-height: 1.5; color: var(--rs-primary); }

@media (max-width: 767px) {
  .rs-pp-row { flex-direction: column; }
}
</style>
