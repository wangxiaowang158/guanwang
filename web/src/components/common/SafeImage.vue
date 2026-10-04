<template>
  <!-- 带占位的图片：无地址或加载失败时显示品牌底色占位，版面不塌陷（SRS 3.5.1 图片加载失败） -->
  <img
    v-if="src && !failed"
    :src="src"
    :alt="alt"
    :width="width"
    :height="height"
    :loading="eager ? 'eager' : 'lazy'"
    decoding="async"
    class="safe-image"
    @error="failed = true"
  />
  <div v-else class="safe-image safe-image--placeholder" role="img" :aria-label="alt || '暂无图片'">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" aria-hidden="true">
      <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 19.5h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5z" />
    </svg>
  </div>
</template>

<script setup lang="ts">
// 通用图片：统一处理「未配图」与「图挂了」两种情况，调用方不必各写一遍 v-if/v-else
import { ref, watch } from 'vue'

const props = defineProps<{
  src?: string
  alt?: string
  width: number
  height: number
  /** 首屏图片传 true，其余默认懒加载 */
  eager?: boolean
}>()

const failed = ref(false)
// 地址变化（翻页复用组件）时重置失败态，否则新图也会被当成失败
watch(() => props.src, () => { failed.value = false })
</script>

<style scoped>
.safe-image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.safe-image--placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  /* 品牌浅色底 + 细网格，缺图时仍像刻意留出的版面，而不是一块空白 */
  background:
    linear-gradient(rgba(11, 87, 208, 0.05) 1px, transparent 1px) 0 0 / 24px 24px,
    linear-gradient(90deg, rgba(11, 87, 208, 0.05) 1px, transparent 1px) 0 0 / 24px 24px,
    var(--color-brand-50);
  color: var(--color-brand-300);
}
.safe-image--placeholder svg {
  width: 40px;
  height: 40px;
}
</style>
