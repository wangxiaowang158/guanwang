<template>
  <!-- 相关推荐：同栏目里业务线/行业相近的几条，读完一个案例顺手看同类 -->
  <section class="ar" :class="{ 'ar--s2': style2 }" aria-labelledby="article-related-title">
    <h2 id="article-related-title" class="ar-title">{{ heading }}</h2>
    <ul class="ar-grid">
      <li v-for="item in items" :key="item.id">
        <RouterLink :to="`/article/${item.id}`" class="ar-card">
          <span class="ar-media">
            <SafeImage :src="item.image" :alt="item.title" :width="480" :height="300" />
          </span>
          <span class="ar-body">
            <span class="ar-name">{{ item.title }}</span>
            <span v-if="item.highlight" class="ar-hl">{{ item.highlight }}</span>
          </span>
        </RouterLink>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
// 卡片整块可点，封面缺失时 SafeImage 显示占位，不让卡片高度参差
import type { ArticleRelated } from '@/api/article'
import SafeImage from '@/components/common/SafeImage.vue'

withDefaults(defineProps<{ items: ArticleRelated[]; heading?: string; style2?: boolean }>(), {
  heading: '相关推荐',
})
</script>

<style scoped>
.ar { margin-top: 56px; }
.ar-title { margin: 0 0 20px; font-size: var(--text-fs-h3, 22px); font-weight: 700; color: var(--color-ink-900); }
.ar-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin: 0; padding: 0; list-style: none; }
@media (min-width: 900px) {
  .ar-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
}
.ar-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background: #fff;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-lg);
  transition: border-color var(--dur-base, 300ms), box-shadow var(--dur-base, 300ms);
}
.ar-card:hover { border-color: var(--color-brand-600); box-shadow: 0 6px 20px rgba(15, 35, 70, 0.08); }
.ar-card:focus-visible { outline: 2px solid var(--color-brand-600); outline-offset: 2px; }
.ar--s2 .ar-card { border-radius: 0; }
.ar--s2 .ar-card:hover { border-color: var(--rs-primary); }
.ar-media { display: block; aspect-ratio: 16 / 10; overflow: hidden; background: var(--color-surface); }
.ar-media :deep(img) { width: 100%; height: 100%; object-fit: cover; }
.ar-body { display: flex; flex-direction: column; gap: 6px; padding: 12px 14px 14px; }
.ar-name {
  font-size: var(--text-fs-sm, 14px);
  font-weight: 600;
  line-height: 1.5;
  color: var(--color-ink-900);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.ar-hl { font-size: var(--text-fs-caption, 13px); font-weight: 600; color: var(--color-brand-600); }
.ar--s2 .ar-hl { color: var(--rs-primary); }
</style>
