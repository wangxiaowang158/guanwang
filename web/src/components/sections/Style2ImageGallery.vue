<template>
  <!-- 样式二·图集：直角等分网格，间隔用细线分隔 -->
  <div v-if="images.length">
    <Style2SectionHead :heading="heading" :subheading="subheading" :on-dark="onDark" />
    <ul class="rs-ig-grid">
      <li v-for="(src, i) in images" :key="`${i}-${src}`" class="rs-ig-item">
        <SafeImage :src="src" :alt="`${altPrefix}${i + 1}`" :width="640" :height="400" />
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
// 样式二图集：props 约定同 ImageGallery
import SafeImage from '@/components/common/SafeImage.vue'
import Style2SectionHead from './Style2SectionHead.vue'

withDefaults(defineProps<{
  images: string[]
  heading?: string
  subheading?: string
  onDark?: boolean
  altPrefix?: string
}>(), { altPrefix: '现场图片 ' })
</script>

<style scoped>
.rs-ig-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 2px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.rs-ig-item { aspect-ratio: 4 / 3; overflow: hidden; background: var(--rs-bg-cream); }
.rs-ig-item :deep(img) { transition: transform 0.5s ease; }
.rs-ig-item:hover :deep(img) { transform: scale(1.05); }
</style>
