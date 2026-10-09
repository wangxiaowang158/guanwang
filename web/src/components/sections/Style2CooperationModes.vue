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
.rs-cm-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1px;
  margin: 0;
  padding: 0;
  list-style: none;
  background: var(--rs-border);
  border: 1px solid var(--rs-border);
}
.rs-cm-item { position: relative; padding: 36px 28px 28px; background: #fff; transition: background 0.25s ease; }
.rs-cm-item::before { content: ''; position: absolute; top: 0; left: 28px; width: 32px; height: 3px; background: var(--rs-primary); }
.rs-cm-item:hover { background: var(--rs-bg-cream); }
.rs-cm-title { margin: 0 0 10px; font-size: 18px; font-weight: 700; color: var(--rs-text-dark); }
.rs-cm-desc { margin: 0; font-size: 14px; line-height: 1.75; color: var(--rs-text-body); }
</style>
