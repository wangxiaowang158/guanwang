<template>
  <!-- 三大业务：配图 + 业务名 + 主张 + 一句话说明 + 查看详情；缺字段的行不显示，无数据整块不渲染 -->
  <HomeBlock v-if="briefs.length" id="business-trio" :eyebrow="eyebrow || '三大业务'" :title="title || '能源智能体 · 建筑生命体 · 未来人居'" :style2="style2" :tone="tone || 'surface'">
    <ul class="ht-grid">
      <li v-for="(b, i) in briefs" :key="b.key" class="ht-card">
        <div v-if="b.image || b.video" class="ht-media tone-light">
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
  padding: 36px 32px;
  /* 苹果式卡片：不描边，靠卡片底色与板块底色错开分层 */
  background: var(--hb-card, var(--color-elevated));
  border-radius: var(--radius-xl);
}
.ht-index { font-size: 24px; font-weight: 700; color: var(--color-ink-400); }
.ht-name { margin: 8px 0 12px; font-size: var(--text-fs-sm); font-weight: 600; color: var(--color-ink-500); }
.ht-pain { margin: 0 0 16px; font-size: var(--text-fs-h3); font-weight: 700; line-height: 1.35; color: var(--color-ink-900); overflow-wrap: anywhere; }
.ht-row { margin: 0 0 12px; font-size: var(--text-fs-sm); line-height: 1.8; color: var(--color-ink-700); overflow-wrap: anywhere; }
/* 配图贴卡片顶边铺满：抵消卡片内边距；信息图多为白底，放进浅色作用域，深色站里也不突兀 */
.ht-media { margin: -36px -32px 20px; overflow: hidden; background: var(--color-canvas); }
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
  background: transparent;
  border: 1px solid var(--color-line);
  border-radius: 999px;
  transition: color var(--dur-fast), border-color var(--dur-fast);
}
.ht-scene:hover { color: var(--color-brand-600); border-color: var(--color-brand-600); }
.ht-scene:focus-visible { outline: 2px solid var(--color-brand-600); outline-offset: 2px; }
/* 链接推到卡片底部，三张卡内容长短不一时底部对齐 */
.ht-more {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 44px;
  margin-top: auto;
  padding-top: 8px;
  font-size: var(--text-fs-body);
  color: var(--color-brand-600);
}
.ht-more:hover { text-decoration: underline; }
</style>
