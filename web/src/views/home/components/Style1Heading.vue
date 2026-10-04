<template>
  <!-- 样式一首页板块标题：眉标 + 主标题 -->
  <header class="s1-heading" :class="{ 's1-heading--dark': onDark }">
    <span class="s1-heading-eyebrow">{{ eyebrow }}</span>
    <!-- 主标题由后台配置，可能留空；空时不渲染，免得留一个空 h2 占位 -->
    <h2 v-if="title" class="s1-heading-title">{{ title }}</h2>
  </header>
</template>

<script setup lang="ts">
// 板块标题，纯展示；onDark 用于深色底板块
defineProps<{ eyebrow: string; title: string; onDark?: boolean }>()
</script>

<style scoped>
.s1-heading {
  text-align: center;
  margin-bottom: var(--head-gap);
}
.s1-heading-eyebrow {
  display: inline-block;
  font-size: var(--text-fs-xs);
  font-weight: 600;
  letter-spacing: 0.16em;
  color: var(--color-brand-600);
  margin-bottom: 12px;
}
.s1-heading-title {
  font-size: var(--text-fs-h2);
  font-weight: 700;
  line-height: 1.25;
  color: var(--color-ink-900);
  margin: 0;
}
.s1-heading--dark .s1-heading-eyebrow { color: var(--color-accent); }
.s1-heading--dark .s1-heading-title { color: #fff; }
</style>
