<template>
  <!-- 样式二·合作模式：直角分格，顶部红色短条标识 -->
  <div v-if="items.length">
    <Style2SectionHead :heading="heading" :subheading="subheading" :on-dark="onDark" />
    <ul class="rs-cm-list">
      <li v-for="(m, i) in items" :key="i" class="rs-cm-item">
        <h3 class="rs-cm-title">{{ m.title }}</h3>
        <p v-if="m.desc" class="rs-cm-desc">{{ m.desc }}</p>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
// 样式二合作模式：props 约定同 CooperationModes
import type { ExtraItem } from '@/api/page'
import Style2SectionHead from './Style2SectionHead.vue'

defineProps<{
  items: ExtraItem[]
  heading?: string
  subheading?: string
  onDark?: boolean
}>()
</script>

<style scoped>
/* 独立大圆角卡片网格，无描边、无顶部色条、无 hover 变色；底色与区块错开分层 */
.rs-cm-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 20px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.rs-cm-item { position: relative; padding: 32px 28px; background: var(--section-card, var(--rs-bg-cream)); border-radius: var(--radius-xl); }
.rs-cm-title { margin: 0 0 10px; font-size: var(--text-fs-h3); font-weight: 700; line-height: 1.3; color: var(--rs-text-dark); }
.rs-cm-desc { margin: 0; font-size: 14px; line-height: 1.75; color: var(--rs-text-body); }
</style>
