<template>
  <!-- 加载骨架：与真实条目等高的占位块，内容到达前不闪「暂无内容」 -->
  <div class="skeleton-grid" :style="{ '--cols': Math.min(rows, 4) }" aria-busy="true" aria-label="加载中">
    <div v-for="i in rows" :key="i" class="skeleton-item" :class="{ 'skeleton-item--tall': tall }"></div>
  </div>
</template>

<script setup lang="ts">
// 通用加载骨架：rows 为占位块数量，tall 用于图文类条目
withDefaults(defineProps<{ rows?: number; tall?: boolean }>(), { rows: 3, tall: false })
</script>

<style scoped>
.skeleton-grid {
  display: grid;
  grid-template-columns: repeat(var(--cols), minmax(0, 1fr));
  gap: 24px;
}
@media (max-width: 767px) {
  .skeleton-grid { grid-template-columns: 1fr; }
}
.skeleton-item {
  height: 160px;
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  animation: skeleton-pulse 1.4s ease-in-out infinite;
}
.skeleton-item--tall { height: 280px; }
/* 只动 opacity，合成器友好 */
@keyframes skeleton-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.55; }
}
</style>
