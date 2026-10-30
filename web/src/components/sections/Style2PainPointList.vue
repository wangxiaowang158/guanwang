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
/* 每行一张大圆角卡，行内三段用 1px 细线分隔；卡片底色与区块错开（--section-card 由 ChannelPage 给出） */
.rs-pp-list { display: flex; flex-direction: column; gap: 16px; margin: 0; padding: 0; list-style: none; }
.rs-pp-row { display: flex; gap: 1px; overflow: hidden; background: var(--rs-border); border-radius: var(--radius-xl); }
.rs-pp-cell { position: relative; flex: 1 1 0; min-width: 0; padding: 28px 32px; background: var(--section-card, var(--rs-bg-cream)); }
.rs-pp-index { position: absolute; top: 24px; right: 28px; font-size: 28px; font-weight: 700; color: var(--rs-text-muted); opacity: 0.3; }
.rs-pp-tag { margin: 0 0 10px; font-size: 14px; font-weight: 600; color: var(--rs-text-muted); }
.rs-pp-title { margin: 0 0 8px; font-size: var(--text-fs-h4); font-weight: 700; line-height: 1.35; color: var(--rs-text-dark); }
.rs-pp-text { margin: 0; font-size: 14px; line-height: 1.75; color: var(--rs-text-body); }
.rs-pp-text--strong { font-size: 15px; color: var(--rs-text-dark); }
.rs-pp-value { margin: 0; font-size: 20px; font-weight: 700; line-height: 1.5; color: var(--rs-primary); }

@media (max-width: 767px) {
  .rs-pp-row { flex-direction: column; }
}
</style>
