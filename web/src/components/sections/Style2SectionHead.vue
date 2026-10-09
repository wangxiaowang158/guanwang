<template>
  <!-- 样式二区块标题：左对齐主标题 + 红色短条 + 副标题，新区块组件共用 -->
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
.rs-head-title {
  margin: 0;
  font-size: var(--rs-text-h2);
  font-weight: 700;
  line-height: 1.3;
  color: var(--rs-text-dark);
}
.rs-head-sub {
  max-width: 48rem;
  margin: 12px 0 0;
  font-size: 15px;
  line-height: 1.8;
  color: var(--rs-text-body);
}
.rs-head-bar {
  width: 48px;
  height: 3px;
  margin: 18px 0 36px;
  background: var(--rs-primary);
}
.rs-head--ondark .rs-head-title { color: #fff; }
.rs-head--ondark .rs-head-sub { color: var(--rs-text-light-sub); }
</style>
