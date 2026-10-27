<template>
  <!-- 三大业务：配图 + 业务名 + 主张 + 一句话说明 + 查看详情；缺字段的行不显示，无数据整块不渲染 -->
  <HomeBlock v-if="briefs.length" id="business-trio" :eyebrow="eyebrow || '三大业务'" :title="title || '能源智能体 · 建筑生命体 · 未来人居'" :style2="style2" :tone="tone || 'surface'">
    <ul class="ht-grid">
      <li v-for="(b, i) in briefs" :key="b.key" class="ht-card" :class="{ 'ht-card--s2': style2 }">
        <div v-if="b.image || b.video" class="ht-media">
          <SafeMedia :image="b.image" :video="b.video" :alt="b.title || b.name" :width="480" :height="300" fit="contain" class="ht-img" />
        </div>
        <span v-else class="ht-index tabular-nums" aria-hidden="true">{{ String(i + 1).padStart(2, '0') }}</span>
        <p class="ht-name">{{ b.name }}</p>
        <h3 v-if="b.title" class="ht-pain">{{ b.title }}</h3>
        <p v-if="b.desc" class="ht-row">{{ b.desc }}</p>
        <!-- 场景直达：业务页核心产品前几条，点了直接落到业务页产品区块，少翻一层 -->
        <ul v-if="b.scenes.length" class="ht-scenes" :aria-label="`${b.name}核心产品`">
          <li v-for="name in b.scenes" :key="name">
            <RouterLink :to="`${b.path}#products`" class="ht-scene">{{ name }}</RouterLink>
          </li>
        </ul>
        <RouterLink :to="b.path" class="ht-more">
          查看详情<span class="sr-only">：{{ b.name }}</span>
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
        </RouterLink>
      </li>
    </ul>
  </HomeBlock>
</template>

<script setup lang="ts">
// 首页三大业务卡片，数据见 useBusinessBriefs（取自业务页解决方案区块）；样式一圆角描边，样式二直角红条
import type { BusinessBrief } from '@/composables/useHomeShowcase'
import SafeMedia from '@/components/common/SafeMedia.vue'
import HomeBlock from './HomeBlock.vue'

defineProps<{
  briefs: BusinessBrief[]
  style2?: boolean
  /** 板块小标题与主标题，后台首页布局或栏目配置了用配置，缺省用内置文案 */
  eyebrow?: string
  title?: string
  /** 板块底色，后台首页布局决定；缺省为模板默认 */
  tone?: 'white' | 'surface' | 'dark'
}>()
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
  background: var(--hb-card, #fff);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-lg);
}
.ht-card--s2 { border: 0; border-top: 3px solid var(--rs-primary); border-radius: 0; }
.ht-index { font-size: 24px; font-weight: 800; color: var(--color-brand-600); opacity: 0.25; }
.ht-card--s2 .ht-index { color: var(--rs-primary); }
.ht-name { margin: 8px 0 12px; font-size: var(--text-fs-caption); font-weight: 600; letter-spacing: 0.08em; color: var(--color-brand-600); }
.ht-card--s2 .ht-name { color: var(--rs-primary); }
.ht-pain { margin: 0 0 16px; font-size: var(--text-fs-h4); font-weight: 700; line-height: 1.5; color: var(--color-ink-900); overflow-wrap: anywhere; }
.ht-card--s2 .ht-pain { color: var(--rs-text-dark); }
.ht-row { margin: 0 0 12px; font-size: var(--text-fs-sm); line-height: 1.8; color: var(--color-ink-700); overflow-wrap: anywhere; }
.ht-card--s2 .ht-row { color: var(--rs-text-body); }
/* 配图贴卡片顶边铺满：抵消卡片内边距；信息图按比例完整显示，不裁切 */
.ht-media { margin: -32px -28px 16px; overflow: hidden; background: #fff; border-bottom: 1px solid var(--color-line); }
.ht-media .ht-img { display: block; width: 100%; height: 200px; object-fit: contain; }
/* 说明文字最多四行，三张卡高度接近 */
.ht-row { display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; }
/* 场景直达：小号描边标签，点击区域不小于 32px 高 */
.ht-scenes { display: flex; flex-wrap: wrap; gap: 8px; margin: 4px 0 8px; padding: 0; list-style: none; }
.ht-scene {
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  padding: 0 12px;
  font-size: 13px;
  color: var(--color-ink-700);
  background: #fff;
  border: 1px solid var(--color-line);
  border-radius: 999px;
  transition: color var(--dur-fast), border-color var(--dur-fast);
}
.ht-scene:hover { color: var(--color-brand-600); border-color: var(--color-brand-600); }
.ht-scene:focus-visible { outline: 2px solid var(--color-brand-600); outline-offset: 2px; }
.ht-card--s2 .ht-scene { border-radius: 0; }
.ht-card--s2 .ht-scene:hover { color: var(--rs-primary); border-color: var(--rs-primary); }
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
