<template>
  <!-- 资质与研发实力：证书/荣誉陈列，有图展示图，无图展示文字徽章；无数据整块不渲染 -->
  <HomeBlock v-if="items.length" id="honor" eyebrow="资质与研发实力" :style2="style2" tone="white">
    <ul class="hh-grid">
      <li v-for="h in items" :key="h.id" class="hh-item" :class="{ 'hh-item--s2': style2 }">
        <div v-if="imgs.usable(h.image)" class="hh-media">
          <img :src="h.image" :alt="h.title" width="240" height="160" loading="lazy" @error="imgs.markBroken(h.image)" />
        </div>
        <h3 class="hh-title">{{ h.title }}</h3>
        <p v-if="h.desc" class="hh-desc">{{ h.desc }}</p>
      </li>
    </ul>
  </HomeBlock>
</template>

<script setup lang="ts">
// 首页资质展示：图片失效回退为纯文字徽章，版面不出现破图
import type { HonorItem } from '@/api/home'
import { useBrokenImages } from '@/composables/useBrokenImages'
import HomeBlock from './HomeBlock.vue'

defineProps<{ items: HonorItem[]; style2?: boolean }>()

const imgs = useBrokenImages()
</script>

<style scoped>
/* 窄屏两列、宽屏最多四列，文字长时自动换行不撑破 */
.hh-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin: 0; padding: 0; list-style: none; }
@media (min-width: 900px) {
  .hh-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 24px; }
}
.hh-item { display: flex; flex-direction: column; align-items: center; justify-content: center; min-width: 0; padding: 24px 16px; text-align: center; background: var(--color-surface); border: 1px solid var(--color-line); border-radius: var(--radius-lg); }
.hh-item--s2 { background: var(--rs-bg-cream); border-color: var(--rs-border); border-radius: 0; }
.hh-media { width: 100%; aspect-ratio: 3 / 2; margin-bottom: 12px; overflow: hidden; }
.hh-media img { width: 100%; height: 100%; object-fit: contain; display: block; }
.hh-title { margin: 0; font-size: 16px; font-weight: 700; line-height: 1.5; color: var(--color-ink-900); overflow-wrap: anywhere; }
.hh-item--s2 .hh-title { color: var(--rs-text-dark); }
.hh-desc { margin: 6px 0 0; font-size: 13px; line-height: 1.7; color: var(--color-ink-500); overflow-wrap: anywhere; }
</style>
