<template>
  <!-- 首页新闻资讯：三列卡片（配图 + 日期 + 标题 + 摘要），整卡进详情；底部「更多资讯」进新闻页；无数据整块不渲染 -->
  <HomeBlock v-if="items.length" id="news" :eyebrow="eyebrow || '新闻资讯'" :title="title || '中瑞恒最新动态'" :style2="style2" :tone="tone || 'white'">
    <ul class="hn-grid">
      <li v-for="item in items" :key="item.id" class="hn-card" :class="{ 'hn-card--s2': style2 }">
        <ItemLink :item="item" link-class="hn-link" class="hn-inner">
          <div class="hn-media">
            <SafeImage :src="item.image" :fallback="fallback" :alt="item.title" :width="480" :height="270" />
          </div>
          <div class="hn-body">
            <time v-if="item.date" :datetime="item.date" class="hn-date tabular-nums">{{ item.date }}</time>
            <h3 class="hn-title">{{ item.title }}</h3>
            <p v-if="item.desc" class="hn-desc">{{ item.desc }}</p>
          </div>
        </ItemLink>
      </li>
    </ul>
    <div class="hn-more-wrap">
      <RouterLink to="/news" class="hn-more" :class="{ 'hn-more--s2': style2 }">更多资讯</RouterLink>
    </div>
  </HomeBlock>
</template>

<script setup lang="ts">
// 首页新闻三列，数据见 useHomeNews；点击行为与栏目页一致（有正文进详情、有链接新窗口）
import type { PageItem } from '@/api/page'
import SafeImage from '@/components/common/SafeImage.vue'
import ItemLink from '@/components/sections/ItemLink.vue'
import { defaultImageOf } from '@/config/defaultImages'
import HomeBlock from './HomeBlock.vue'

defineProps<{
  items: PageItem[]
  style2?: boolean
  /** 板块小标题与主标题，后台首页布局或栏目配置了用配置，缺省用内置文案 */
  eyebrow?: string
  title?: string
  /** 板块底色，后台首页布局决定；缺省为模板默认 */
  tone?: 'white' | 'surface' | 'dark'
}>()

/** 新闻未配图时的缺省配图 */
const fallback = defaultImageOf('news')
</script>

<style scoped>
.hn-grid { display: grid; grid-template-columns: 1fr; gap: 24px; margin: 0; padding: 0; list-style: none; }
@media (min-width: 768px) { .hn-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
.hn-card { min-width: 0; }
.hn-inner {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background: #fff;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-lg);
}
.hn-card--s2 .hn-inner { border-radius: 0; }
:deep(.hn-link) { color: inherit; text-decoration: none; transition: box-shadow var(--dur-fast); }
:deep(.hn-link:hover) { box-shadow: var(--shadow-2); }
:deep(.hn-link:focus-visible) { outline: 2px solid var(--color-brand-600); outline-offset: 2px; }
.hn-media { aspect-ratio: 16 / 9; overflow: hidden; background: var(--color-surface); }
.hn-media :deep(img) { width: 100%; height: 100%; object-fit: cover; }
.hn-body { padding: 20px 24px 24px; }
.hn-date { font-size: 13px; color: var(--color-ink-500); }
.hn-title { margin: 8px 0 0; font-size: 17px; font-weight: 600; line-height: 1.5; color: var(--color-ink-900); }
.hn-desc {
  display: -webkit-box;
  margin: 8px 0 0;
  overflow: hidden;
  font-size: 14px;
  line-height: 1.7;
  color: var(--color-ink-500);
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
.hn-more-wrap { margin-top: 32px; text-align: center; }
.hn-more {
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
.hn-more:hover { color: #fff; background: var(--color-brand-600); }
.hn-more--s2 { color: var(--rs-primary); border-color: var(--rs-primary); border-radius: 0; }
.hn-more--s2:hover { background: var(--rs-primary); }
</style>
