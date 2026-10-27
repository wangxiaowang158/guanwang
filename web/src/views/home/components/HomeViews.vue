<template>
  <!-- 首页「我眼中的中瑞恒」：媒体报道与行业评价，四列卡片（配图或视频 + 标题 + 说明），有链接时整卡新窗口打开；无数据整块不渲染 -->
  <HomeBlock v-if="items.length" id="view" :eyebrow="eyebrow || '我眼中的中瑞恒'" :title="title || '媒体与行业的关注和认可'" :style2="style2" :tone="tone || 'white'">
    <ul class="hv-grid">
      <li v-for="v in items" :key="v.id" class="hv-card" :class="{ 'hv-card--s2': style2 }">
        <component
          :is="safeExternalUrl(v.link) ? 'a' : 'article'"
          :href="safeExternalUrl(v.link) || undefined"
          :target="safeExternalUrl(v.link) ? '_blank' : undefined"
          :rel="safeExternalUrl(v.link) ? 'noopener noreferrer' : undefined"
          class="hv-inner"
        >
          <div class="hv-media">
            <SafeMedia :image="v.image" :video="v.video" :fallback="fallback" :alt="v.title" :width="400" :height="225" />
          </div>
          <div class="hv-body">
            <h3 class="hv-title">{{ v.title }}</h3>
            <p v-if="v.desc" class="hv-desc">{{ v.desc }}</p>
          </div>
        </component>
      </li>
    </ul>
  </HomeBlock>
</template>

<script setup lang="ts">
// 首页「我眼中的中瑞恒」，后台「首页 → 我眼中的中瑞恒」维护；两套样式共用，style2 切直角红条
import type { ViewItem } from '@/api/home'
import SafeMedia from '@/components/common/SafeMedia.vue'
import { HOME_DEFAULT_IMAGES } from '@/config/defaultImages'
import { safeExternalUrl } from '@/utils/sanitize'
import HomeBlock from './HomeBlock.vue'

defineProps<{
  items: ViewItem[]
  style2?: boolean
  eyebrow?: string
  title?: string
  tone?: 'white' | 'surface' | 'dark'
}>()

const fallback = HOME_DEFAULT_IMAGES.view
</script>

<style scoped>
.hv-grid { display: grid; grid-template-columns: 1fr; gap: 24px; margin: 0; padding: 0; list-style: none; }
@media (min-width: 640px) { .hv-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (min-width: 1024px) { .hv-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
.hv-card { min-width: 0; }
.hv-inner {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  color: inherit;
  text-decoration: none;
  background: #fff;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-lg);
  transition: box-shadow var(--dur-base), transform var(--dur-base) var(--ease-out);
}
a.hv-inner:hover { box-shadow: var(--shadow-2); transform: translateY(-2px); }
a.hv-inner:focus-visible { outline: 2px solid var(--color-brand-600); outline-offset: 2px; }
.hv-card--s2 .hv-inner { border: 0; border-top: 2px solid var(--rs-primary); border-radius: 0; }
.hv-card--s2 a.hv-inner:focus-visible { outline-color: var(--rs-primary); }
.hv-media { aspect-ratio: 16 / 9; overflow: hidden; background: var(--color-brand-50); }
.hv-card--s2 .hv-media { background: var(--rs-bg-cream); }
.hv-media :deep(img),
.hv-media :deep(video) { transition: transform 0.5s ease; }
a.hv-inner:hover .hv-media :deep(img),
a.hv-inner:hover .hv-media :deep(video) { transform: scale(1.04); }
@media (prefers-reduced-motion: reduce) {
  a.hv-inner:hover { transform: none; }
  a.hv-inner:hover .hv-media :deep(img),
  a.hv-inner:hover .hv-media :deep(video) { transform: none; }
}
.hv-body { padding: 20px 24px 24px; }
.hv-title { margin: 0; font-size: 16px; font-weight: 600; line-height: 1.5; color: var(--color-ink-900); }
.hv-card--s2 .hv-title { font-weight: 700; color: var(--rs-text-dark); }
.hv-desc { margin: 8px 0 0; font-size: 14px; line-height: 1.7; color: var(--color-ink-500); }
.hv-card--s2 .hv-desc { color: var(--rs-text-muted); }
</style>
