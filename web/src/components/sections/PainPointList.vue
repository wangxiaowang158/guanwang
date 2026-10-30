<template>
  <!-- 样式一·痛点方案：每条按「痛点 → 解决方案 → 量化价值」三段展示，缺哪段不渲染哪段 -->
  <div v-if="items.length">
    <SectionHeading v-if="heading" :heading="heading" :subheading="subheading" :on-dark="onDark" />
    <ol class="pp-list">
      <li v-for="(p, i) in items" :key="i" class="pp-row">
        <div class="pp-cell pp-cell--pain">
          <p class="pp-tag">痛点</p>
          <h3 class="pp-title">{{ p.title }}</h3>
          <p v-if="p.desc" class="pp-text">{{ p.desc }}</p>
        </div>
        <div v-if="p.solution" class="pp-cell pp-cell--solution">
          <p class="pp-tag">解决方案</p>
          <p class="pp-text pp-text--strong">{{ p.solution }}</p>
        </div>
        <div v-if="p.value" class="pp-cell pp-cell--value">
          <p class="pp-tag">量化价值</p>
          <p class="pp-value">{{ p.value }}</p>
        </div>
      </li>
    </ol>
  </div>
</template>

<script setup lang="ts">
// 痛点方案列表：只接收 extra.pains，数据由页面从条目 extra 取出后传入
import type { ExtraPain } from '@/api/page'
import SectionHeading from './SectionHeading.vue'

defineProps<{
  items: ExtraPain[]
  heading?: string
  subheading?: string
  onDark?: boolean
}>()
</script>

<style scoped>
.pp-list { display: flex; flex-direction: column; gap: 16px; margin: 0; padding: 0; list-style: none; }
.pp-row {
  display: flex;
  /* 无描边：底色与区块错开分层（--section-card 由 ChannelPage 给出） */
  background: var(--section-card, var(--color-surface));
  border-radius: var(--radius-xl);
  overflow: hidden;
}
.pp-cell { position: relative; flex: 1 1 0; min-width: 0; padding: 28px 32px; }
/* 段与段之间用细分隔线 + 小箭头衔接，表达「问题 → 方案 → 结果」的方向；箭头底色与卡片同色才看不出接缝 */
.pp-cell + .pp-cell { border-left: 1px solid var(--color-line); }
.pp-cell + .pp-cell::before {
  content: '';
  position: absolute;
  left: -7px;
  top: 36px;
  width: 12px;
  height: 12px;
  background: var(--section-card, var(--color-surface));
  border-top: 1px solid var(--color-line);
  border-right: 1px solid var(--color-line);
  transform: rotate(45deg);
}
.pp-tag { margin: 0 0 8px; font-size: 14px; font-weight: 600; color: var(--color-ink-500); }
.pp-cell--solution .pp-tag,
.pp-cell--value .pp-tag { color: var(--color-brand-600); }
.pp-title { margin: 0 0 8px; font-size: var(--text-fs-h4); font-weight: 700; line-height: 1.35; color: var(--color-ink-900); }
.pp-text { margin: 0; font-size: 14px; line-height: 1.75; color: var(--color-ink-700); }
.pp-text--strong { font-size: 15px; color: var(--color-ink-900); }
.pp-value { margin: 0; font-size: 20px; font-weight: 700; line-height: 1.5; color: var(--color-brand-600); }

@media (max-width: 767px) {
  .pp-row { flex-direction: column; }
  .pp-cell + .pp-cell { border-left: 0; border-top: 1px solid var(--color-line); }
  .pp-cell + .pp-cell::before { display: none; }
}
</style>
