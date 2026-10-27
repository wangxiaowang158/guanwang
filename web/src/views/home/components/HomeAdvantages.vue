<template>
  <!-- 首页核心优势：四张卡（图标或序号 + 标题 + 说明）；无数据整块不渲染 -->
  <HomeBlock v-if="items.length" id="advantage" :eyebrow="eyebrow || '核心优势'" :title="title || '从方案到交付的全程保障'" :style2="style2" :tone="tone || 'white'">
    <ul class="ha-grid">
      <li v-for="(item, i) in items" :key="item.id" class="ha-card" :class="{ 'ha-card--s2': style2 }">
        <!-- 后台选了图标显示图标，未选（或图标已下架）回落为序号 -->
        <component :is="homeIconOf(item.icon)" v-if="homeIconOf(item.icon)" class="ha-icon" aria-hidden="true" />
        <span v-else class="ha-index tabular-nums" aria-hidden="true">{{ String(i + 1).padStart(2, '0') }}</span>
        <h3 class="ha-title">{{ item.title }}</h3>
        <p v-if="item.desc" class="ha-desc">{{ item.desc }}</p>
      </li>
    </ul>
  </HomeBlock>
</template>

<script setup lang="ts">
// 首页核心优势（框架图：方案定制 / 前卫设计 / 精工品质 / 完美配套），后台「首页 → 核心优势」维护
import type { ServiceItem } from '@/api/home'
import { homeIconOf } from '@/config/homeIcons'
import HomeBlock from './HomeBlock.vue'

defineProps<{
  items: ServiceItem[]
  /** 板块小标题与主标题，取后台栏目名与区块副标题，缺省用内置文案 */
  eyebrow?: string
  title?: string
  style2?: boolean
  /** 板块底色，后台首页布局决定；缺省为模板默认 */
  tone?: 'white' | 'surface' | 'dark'
}>()
</script>

<style scoped>
.ha-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px; margin: 0; padding: 0; list-style: none; }
@media (min-width: 1024px) { .ha-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
.ha-card {
  min-width: 0;
  padding: 32px 24px;
  text-align: center;
  background: var(--hb-card, var(--color-surface));
  border-radius: var(--radius-lg);
}
.ha-card--s2 { background: var(--hb-card, var(--rs-bg-cream)); border-radius: 0; border-top: 3px solid var(--rs-primary); }
.ha-icon { width: 40px; height: 40px; margin: 0 auto 16px; color: var(--color-brand-600); }
.ha-card--s2 .ha-icon { color: var(--rs-primary); }
.ha-index { display: block; margin-bottom: 12px; font-size: 28px; font-weight: 800; color: var(--color-brand-600); opacity: 0.35; }
.ha-card--s2 .ha-index { color: var(--rs-primary); }
.ha-title { margin: 0; font-size: 18px; font-weight: 700; color: var(--color-ink-900); }
.ha-desc { margin: 10px 0 0; font-size: 14px; line-height: 1.7; color: var(--color-ink-500); }
</style>
