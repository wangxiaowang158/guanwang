<template>
  <!-- 首页「我眼中的中瑞恒」：媒体报道与行业评价，四列卡片（配图或视频 + 标题 + 说明），有链接时整卡新窗口打开；无数据整块不渲染 -->
  <HomeBlock v-if="items.length" id="view" :eyebrow="eyebrow || '我眼中的中瑞恒'" :title="title || '媒体与行业的关注和认可'" :style2="style2" :tone="tone || 'white'">
    <ul class="hv-grid">
      <li v-for="v in items" :key="v.id" class="hv-card">
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
// 首页「我眼中的中瑞恒」，后台「首页 → 我眼中的中瑞恒」维护；三套样式共用同一外观，底色随板块色调
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
  /* 苹果式卡片：不描边、不投影、悬停不上浮，只让图片缓慢放大 */
  background: var(--hb-card, var(--color-elevated));
  border-radius: var(--radius-xl);
}
a.hv-inner:focus-visible { outline: 2px solid var(--color-brand-600); outline-offset: 2px; }
.hv-media { aspect-ratio: 16 / 9; overflow: hidden; background: var(--color-surface); }
.hv-media :deep(img),
.hv-media :deep(video) { transition: transform var(--dur-slow) var(--ease-out); }
a.hv-inner:hover .hv-media :deep(img),
a.hv-inner:hover .hv-media :deep(video) { transform: scale(1.04); }
@media (prefers-reduced-motion: reduce) {
  a.hv-inner:hover .hv-media :deep(img),
  a.hv-inner:hover .hv-media :deep(video) { transform: none; }
}
.hv-body { padding: 24px 28px 28px; }
.hv-title { margin: 0; font-size: var(--text-fs-h4); font-weight: 700; line-height: 1.4; color: var(--color-ink-900); }
.hv-desc { margin: 8px 0 0; font-size: 14px; line-height: 1.7; color: var(--color-ink-500); }
</style>
