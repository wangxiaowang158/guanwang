<template>
  <!-- 样式一·图集：自适应网格，圆角缩略图，首张略大；图片按地址序号生成替代文本 -->
  <div v-if="images.length">
    <SectionHeading v-if="heading" :heading="heading" :subheading="subheading" :on-dark="onDark" />
    <ul class="ig-grid" :class="{ 'ig-grid--fixed': cols }" :style="cols ? { '--cols': cols } : undefined">
      <li v-for="(src, i) in images" :key="`${i}-${src}`" class="ig-item" :class="{ 'ig-item--lead': !cols && i === 0 && images.length > 2 }">
        <SafeMedia v-bind="isVideoUrl(src) ? { video: src } : { image: src }" :alt="`${altPrefix}${i + 1}`" :width="640" :height="400" />
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
// 图集：只接收 extra.gallery（图片或视频地址数组）；视频静音循环播放，图片加载失败由 SafeImage 兜底占位
import SafeMedia from '@/components/common/SafeMedia.vue'
import { isVideoUrl } from '@/utils/media'
import SectionHeading from './SectionHeading.vue'

withDefaults(defineProps<{
  images: string[]
  heading?: string
  subheading?: string
  onDark?: boolean
  /** 图片替代文本前缀，后接序号，如「现场实拍 1」 */
  altPrefix?: string
  /** 电脑端每行列数，后台「区块外观」配置；缺省按宽度自适应 */
  cols?: number
}>(), { altPrefix: '现场图片 ' })
</script>

<style scoped>
.ig-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
  margin: 0;
  padding: 0;
  list-style: none;
}
/* 后台指定了每行列数：电脑端按配置，平板 2 列，手机 1 列 */
.ig-grid--fixed { grid-template-columns: 1fr; }
@media (min-width: 640px) { .ig-grid--fixed { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (min-width: 1024px) { .ig-grid--fixed { grid-template-columns: repeat(var(--cols), minmax(0, 1fr)); } }
.ig-item { aspect-ratio: 16 / 10; overflow: hidden; background: var(--color-surface); border-radius: var(--radius-md); }
/* 首张跨两列两行，形成主次；仅在宽屏、图片多于两张时启用 */
@media (min-width: 900px) {
  .ig-item--lead { grid-column: span 2; grid-row: span 2; aspect-ratio: auto; }
}
.ig-item :deep(img) { transition: transform var(--dur-slow) var(--ease-out); }
.ig-item:hover :deep(img) { transform: scale(1.04); }
</style>
