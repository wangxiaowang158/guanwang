<template>
  <!-- 样式一·客户证言：居中大引文 + 署名 -->
  <div v-if="quote?.text">
    <SectionHeading v-if="heading" :heading="heading" :subheading="subheading" :on-dark="onDark" />
    <figure class="tq" :class="{ 'tq--dark': onDark }">
      <svg class="tq-mark" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M10 6C6.500 7 4 10 4 14v4h6v-6H7c0-2 1-3.500 3-4.200V6zm10 0c-3.500 1-6 4-6 8v4h6v-6h-3c0-2 1-3.500 3-4.200V6z" />
      </svg>
      <blockquote class="tq-text">{{ quote.text }}</blockquote>
      <figcaption v-if="quote.author || quote.org" class="tq-cap">
        <span v-if="quote.author" class="tq-author">{{ quote.author }}</span>
        <span v-if="quote.org" class="tq-org">{{ quote.org }}</span>
      </figcaption>
    </figure>
  </div>
</template>

<script setup lang="ts">
// 客户证言：只接收 extra.quote；text 为空时整块不渲染
import type { ExtraQuote } from '@/api/page'
import SectionHeading from './SectionHeading.vue'

defineProps<{
  quote?: ExtraQuote
  heading?: string
  subheading?: string
  onDark?: boolean
}>()
</script>

<style scoped>
.tq {
  max-width: 52rem;
  margin: 0 auto;
  padding: 40px 36px;
  text-align: center;
  background: var(--color-brand-50);
  border-radius: var(--radius-lg);
}
.tq-mark { width: 32px; height: 32px; margin: 0 auto 16px; color: var(--color-brand-300); }
.tq-text { margin: 0; font-size: var(--text-fs-body-lg); line-height: 1.9; color: var(--color-ink-900); }
.tq-cap { margin-top: 20px; display: flex; flex-direction: column; gap: 2px; font-size: 14px; }
.tq-author { font-weight: 600; color: var(--color-ink-900); }
.tq-org { color: var(--color-ink-500); }

/* 背景图区块：改半透明白底与白字 */
.tq--dark { background: rgba(255, 255, 255, 0.1); }
.tq--dark .tq-mark { color: rgba(255, 255, 255, 0.5); }
.tq--dark .tq-text,
.tq--dark .tq-author { color: #fff; }
.tq--dark .tq-org { color: var(--color-ink-400); }

@media (max-width: 640px) {
  .tq { padding: 28px 20px; }
}
</style>
