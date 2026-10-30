<template>
  <!-- 首页项目案例：三列卡片（配图 + 行业/模式标签 + 标题 + 两个量化结果），整卡进详情；底部「全部案例」进案例页；无数据整块不渲染 -->
  <HomeBlock v-if="items.length" id="case" :eyebrow="eyebrow || '项目案例'" :title="title || '用节能数据说话的标杆项目'" :style2="style2" :tone="tone || 'white'">
    <ul class="hc-grid">
      <li v-for="item in items" :key="item.id" class="hc-card">
        <ItemLink :item="item" link-class="hc-link" class="hc-inner">
          <div class="hc-media">
            <SafeImage :src="item.image" :fallback="fallback" :alt="item.title" :width="480" :height="270" />
          </div>
          <div class="hc-body">
            <ul v-if="tagsOf(item).length" class="hc-tags">
              <li v-for="t in tagsOf(item)" :key="t" class="hc-tag">{{ t }}</li>
            </ul>
            <h3 class="hc-title">{{ item.title }}</h3>
            <!-- 有量化结果时只摆两个数字，比一段摘要更有说服力；没有再退回摘要 -->
            <dl v-if="metricsOf(item).length" class="hc-metrics">
              <div v-for="m in metricsOf(item)" :key="m.label" class="hc-metric">
                <dt class="hc-metric-label">{{ m.label }}</dt>
                <dd class="hc-metric-value tabular-nums">{{ m.value }}<span v-if="m.unit" class="hc-metric-unit">{{ m.unit }}</span></dd>
              </div>
            </dl>
            <p v-else-if="item.desc" class="hc-desc">{{ item.desc }}</p>
          </div>
        </ItemLink>
      </li>
    </ul>
    <div class="hc-more-wrap">
      <RouterLink to="/case" class="hc-more">查看全部案例</RouterLink>
    </div>
  </HomeBlock>
</template>

<script setup lang="ts">
// 首页项目案例，数据见 useHomeCases；点击行为与栏目页一致（有正文进详情、有链接新窗口）
import type { ExtraMetric, PageItem } from '@/api/page'
import SafeImage from '@/components/common/SafeImage.vue'
import ItemLink from '@/components/sections/ItemLink.vue'
import { chipsOf } from '@/components/sections/itemChips'
import { defaultImageOf } from '@/config/defaultImages'
import HomeBlock from './HomeBlock.vue'

defineProps<{
  items: PageItem[]
  style2?: boolean
  /** 板块小标题与主标题，后台首页布局配置了用配置，缺省用内置文案 */
  eyebrow?: string
  title?: string
  /** 板块底色，后台首页布局决定；缺省为模板默认 */
  tone?: 'white' | 'surface' | 'dark'
}>()

/** 卡片标签最多几个：业务线 / 行业 / 合作模式挤在一行 */
const MAX_TAGS = 3
/** 卡片上的量化结果最多两个，再多一行放不下 */
const MAX_METRICS = 2

/** 标签：业务线与行业（extra），再加行业分类（category）与合作模式（extra.tags，如 EMC / EPC），去重 */
const tagsOf = (item: PageItem): string[] => {
  const all = [...chipsOf(item), item.tag ?? '', ...(item.extra?.tags ?? [])].map(t => t.trim()).filter(Boolean)
  return [...new Set(all)].slice(0, MAX_TAGS)
}

/** 量化结果：节能率、年省电费等，取前两个有数值的 */
const metricsOf = (item: PageItem): ExtraMetric[] =>
  (item.extra?.metrics ?? []).filter(m => m.label && m.value).slice(0, MAX_METRICS)

/** 案例未配图时的缺省配图 */
const fallback = defaultImageOf('case')
</script>
<style scoped>
.hc-grid { display: grid; grid-template-columns: 1fr; gap: 24px; margin: 0; padding: 0; list-style: none; }
@media (min-width: 768px) { .hc-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
.hc-card { min-width: 0; }
.hc-inner {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  /* 苹果式卡片：不描边、不投影，靠与板块底色错开的卡片底色（--hb-card）分层 */
  background: var(--hb-card, var(--color-elevated));
  border-radius: var(--radius-xl);
}
:deep(.hc-link) { color: inherit; text-decoration: none; }
/* 悬停只让图片缓慢放大，卡片本身不上浮不加阴影 */
.hc-media :deep(img) { transition: transform var(--dur-slow) var(--ease-out); }
.hc-inner:hover .hc-media :deep(img) { transform: scale(1.04); }
:deep(.hc-link:focus-visible) { outline: 2px solid var(--color-brand-600); outline-offset: 2px; }
.hc-media { aspect-ratio: 16 / 9; overflow: hidden; background: var(--color-surface); }
.hc-media :deep(img) { width: 100%; height: 100%; object-fit: cover; }
.hc-body { display: flex; flex: 1; flex-direction: column; padding: 24px 28px 28px; }
.hc-tags { display: flex; flex-wrap: wrap; gap: 6px; margin: 0 0 10px; padding: 0; list-style: none; }
.hc-tag {
  padding: 2px 10px;
  font-size: 12px;
  line-height: 20px;
  color: var(--color-ink-500);
  background: var(--color-surface);
  border-radius: 999px;
}
.hc-title { margin: 0; font-size: var(--text-fs-h3); font-weight: 700; line-height: 1.35; color: var(--color-ink-900); overflow-wrap: anywhere; }
.hc-desc {
  display: -webkit-box;
  margin: 8px 0 0;
  overflow: hidden;
  font-size: 14px;
  line-height: 1.7;
  color: var(--color-ink-500);
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
/* 两个量化结果并排，数字放大；推到卡片底部，三张卡对齐 */
.hc-metrics { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin: auto 0 0; padding-top: 16px; }
.hc-metric { padding-top: 12px; border-top: 1px solid var(--color-line); }
.hc-metric-label { font-size: 12px; color: var(--color-ink-500); }
.hc-metric-value { margin: 4px 0 0; font-size: 28px; font-weight: 700; line-height: 1.15; color: var(--color-ink-900); }
.hc-metric-unit { margin-left: 2px; font-size: 14px; font-weight: 500; color: var(--color-ink-500); }
.hc-more-wrap { margin-top: 48px; text-align: center; }
/* 「查看全部」用苹果式文字链：蓝字 + 箭头，不做描边按钮 */
.hc-more {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  font-size: var(--text-fs-body);
  color: var(--color-brand-600);
}
.hc-more::after { content: '›'; margin-left: 4px; font-size: 1.2em; line-height: 1; }
.hc-more:hover { text-decoration: underline; }
</style>
