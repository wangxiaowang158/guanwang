<template>
  <!-- 三大业务简介：痛点标题 → 解决方案简述 → 核心收益 → 查看详情；缺字段的行不显示，无数据整块不渲染 -->
  <HomeBlock v-if="briefs.length" id="business-trio" eyebrow="三大主营业务" title="先看痛点，再看解法" :style2="style2" tone="surface">
    <ul class="ht-grid">
      <li v-for="(b, i) in briefs" :key="b.key" class="ht-card" :class="{ 'ht-card--s2': style2 }">
        <span class="ht-index tabular-nums" aria-hidden="true">{{ String(i + 1).padStart(2, '0') }}</span>
        <p class="ht-name">{{ b.name }}</p>
        <h3 v-if="b.pain" class="ht-pain">{{ b.pain }}</h3>
        <p v-if="b.solution" class="ht-row"><span class="ht-label">解决方案</span>{{ b.solution }}</p>
        <p v-if="b.value" class="ht-row ht-row--value"><span class="ht-label">核心收益</span>{{ b.value }}</p>
        <RouterLink :to="b.path" class="ht-more">
          查看详情<span class="sr-only">：{{ b.name }}</span>
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
        </RouterLink>
      </li>
    </ul>
  </HomeBlock>
</template>

<script setup lang="ts">
// 首页三大业务卡片，数据见 useBusinessBriefs；样式一圆角描边，样式二直角红条
import type { BusinessBrief } from '@/composables/useHomeShowcase'
import HomeBlock from './HomeBlock.vue'

defineProps<{ briefs: BusinessBrief[]; style2?: boolean }>()
</script>

<style scoped>
.ht-grid { display: grid; grid-template-columns: 1fr; gap: 24px; margin: 0; padding: 0; list-style: none; }
@media (min-width: 900px) {
  .ht-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}
.ht-card {
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: 32px 28px;
  background: #fff;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-lg);
}
.ht-card--s2 { border: 0; border-top: 3px solid var(--rs-primary); border-radius: 0; }
.ht-index { font-size: 24px; font-weight: 800; color: var(--color-brand-600); opacity: 0.25; }
.ht-card--s2 .ht-index { color: var(--rs-primary); }
.ht-name { margin: 8px 0 12px; font-size: 13px; font-weight: 600; letter-spacing: 0.08em; color: var(--color-brand-600); }
.ht-card--s2 .ht-name { color: var(--rs-primary); }
.ht-pain { margin: 0 0 16px; font-size: 18px; font-weight: 700; line-height: 1.5; color: var(--color-ink-900); overflow-wrap: anywhere; }
.ht-card--s2 .ht-pain { color: var(--rs-text-dark); }
.ht-row { margin: 0 0 12px; font-size: 14px; line-height: 1.8; color: var(--color-ink-700); overflow-wrap: anywhere; }
.ht-card--s2 .ht-row { color: var(--rs-text-body); }
.ht-label { display: block; margin-bottom: 2px; font-size: 12px; font-weight: 600; color: var(--color-ink-500); }
.ht-row--value { font-weight: 600; color: var(--color-ink-900); }
.ht-card--s2 .ht-row--value { color: var(--rs-primary); }
/* 链接推到卡片底部，三张卡内容长短不一时底部对齐 */
.ht-more {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 44px;
  margin-top: auto;
  padding-top: 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-brand-600);
}
.ht-card--s2 .ht-more { color: var(--rs-primary); }
.ht-more:hover { text-decoration: underline; }
</style>
