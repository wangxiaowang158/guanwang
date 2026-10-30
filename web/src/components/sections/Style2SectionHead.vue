<template>
  <!-- 样式二区块标题：左对齐大字主标题 + 灰色副标题，新区块组件共用 -->
  <div v-if="heading" class="rs-head" :class="{ 'rs-head--ondark': onDark }">
    <h2 class="rs-head-title">{{ heading }}</h2>
    <p v-if="subheading" class="rs-head-sub">{{ subheading }}</p>
    <div class="rs-head-bar"></div>
  </div>
</template>

<script setup lang="ts">
// 样式二区块标题，纯展示；heading 为空时整块不渲染
defineProps<{
  heading?: string
  subheading?: string
  onDark?: boolean
}>()
</script>

<style scoped>
.rs-head { margin-bottom: var(--head-gap); }
.rs-head-title {
  margin: 0;
  font-size: var(--rs-text-h2);
  font-weight: 700;
  line-height: 1.15;
  color: var(--rs-text-dark);
}
.rs-head-sub {
  max-width: 48rem;
  margin: 16px 0 0;
  font-size: var(--text-fs-body-lg);
  line-height: 1.6;
  color: var(--rs-text-muted);
}
/* 苹果风格不用标题下的色条装饰，靠字号与留白区分层次 */
.rs-head-bar { display: none; }
.rs-head--ondark .rs-head-title { color: #fff; }
.rs-head--ondark .rs-head-sub { color: var(--rs-text-light-sub); }
</style>
