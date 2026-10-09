<template>
  <!-- 样式二·客户证言：奶油底 + 左侧红色竖条，文字左对齐 -->
  <div v-if="quote?.text">
    <Style2SectionHead :heading="heading" :subheading="subheading" :on-dark="onDark" />
    <figure class="rs-tq" :class="{ 'rs-tq--dark': onDark }">
      <blockquote class="rs-tq-text">{{ quote.text }}</blockquote>
      <figcaption v-if="quote.author || quote.org" class="rs-tq-cap">
        <span v-if="quote.author" class="rs-tq-author">{{ quote.author }}</span>
        <span v-if="quote.org" class="rs-tq-org">{{ quote.org }}</span>
      </figcaption>
    </figure>
  </div>
</template>

<script setup lang="ts">
// 样式二客户证言：props 约定同 TestimonialQuote
import type { ExtraQuote } from '@/api/page'
import Style2SectionHead from './Style2SectionHead.vue'

defineProps<{
  quote?: ExtraQuote
  heading?: string
  subheading?: string
  onDark?: boolean
}>()
</script>

<style scoped>
.rs-tq {
  max-width: 56rem;
  margin: 0;
  padding: 36px 40px;
  background: var(--rs-bg-cream);
  border-left: 4px solid var(--rs-primary);
}
.rs-tq-text { margin: 0; font-size: 18px; line-height: 1.9; color: var(--rs-text-dark); }
.rs-tq-cap { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 12px; margin-top: 20px; font-size: 14px; }
.rs-tq-author { font-weight: 700; color: var(--rs-text-dark); }
.rs-tq-org { color: var(--rs-text-muted); }

/* 背景图区块：深色底白字 */
.rs-tq--dark { background: var(--rs-bg-dark-soft); }
.rs-tq--dark .rs-tq-text,
.rs-tq--dark .rs-tq-author { color: #fff; }
.rs-tq--dark .rs-tq-org { color: var(--rs-text-light-sub); }

@media (max-width: 640px) {
  .rs-tq { padding: 24px 20px; }
  .rs-tq-text { font-size: 16px; }
}
</style>
