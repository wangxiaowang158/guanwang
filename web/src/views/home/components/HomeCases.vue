<template>
  <!-- 首页项目案例：三列卡片（配图 + 行业/模式标签 + 标题 + 两个量化结果），整卡进详情；底部「全部案例」进案例页；无数据整块不渲染 -->
  <HomeBlock v-if="items.length" id="case" :eyebrow="eyebrow || '项目案例'" :title="title || '用节能数据说话的标杆项目'" :style2="style2" :tone="tone || 'white'">
    <ul class="hc-grid">
      <li v-for="item in items" :key="item.id" class="hc-card" :class="{ 'hc-card--s2': style2 }">
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
      <RouterLink to="/case" class="hc-more" :class="{ 'hc-more--s2': style2, 'hc-more--dark': tone === 'dark' }">查看全部案例</RouterLink>
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
  background: var(--hb-card, #fff);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-lg);
}
.hc-card--s2 .hc-inner { border-radius: 0; border-top: 3px solid var(--rs-primary); }
:deep(.hc-link) { color: inherit; text-decoration: none; transition: box-shadow var(--dur-fast), transform var(--dur-fast); }
:deep(.hc-link:hover) { box-shadow: var(--shadow-2); transform: translateY(-2px); }
:deep(.hc-link:focus-visible) { outline: 2px solid var(--color-brand-600); outline-offset: 2px; }
.hc-media { aspect-ratio: 16 / 9; overflow: hidden; background: var(--color-surface); }
.hc-media :deep(img) { width: 100%; height: 100%; object-fit: cover; }
.hc-body { display: flex; flex: 1; flex-direction: column; padding: 20px 24px 24px; }
.hc-tags { display: flex; flex-wrap: wrap; gap: 6px; margin: 0 0 10px; padding: 0; list-style: none; }
.hc-tag {
  padding: 2px 10px;
  font-size: 12px;
  line-height: 20px;
  color: var(--color-brand-700, #1645c4);
  background: var(--color-brand-50, #eef4ff);
  border-radius: 999px;
}
.hc-card--s2 .hc-tag { color: var(--rs-primary); background: transparent; border: 1px solid currentColor; border-radius: 0; }
.hc-title { margin: 0; font-size: 17px; font-weight: 600; line-height: 1.5; color: var(--color-ink-900); overflow-wrap: anywhere; }
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
.hc-metric-value { margin: 4px 0 0; font-size: 24px; font-weight: 700; line-height: 1.2; color: var(--color-brand-600); }
.hc-card--s2 .hc-metric-value { color: var(--rs-primary); }
.hc-metric-unit { margin-left: 2px; font-size: 13px; font-weight: 500; }
.hc-more-wrap { margin-top: 32px; text-align: center; }
.hc-more {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  padding: 0 28px;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-brand-600);
  border: 1px solid var(--color-brand-600);
  border-radius: var(--radius-md);
}
.hc-more:hover { color: #fff; background: var(--color-brand-600); }
.hc-more--s2 { color: var(--rs-primary); border-color: var(--rs-primary); border-radius: 0; }
.hc-more--s2:hover { background: var(--rs-primary); }
/* 深色底：按钮反白，否则品牌色描边在深蓝上看不清 */
.hc-more--dark { color: #fff; border-color: rgba(255, 255, 255, 0.7); }
.hc-more--dark:hover { color: var(--color-navy-950); background: #fff; }
</style>
