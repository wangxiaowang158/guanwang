<template>
  <!-- 样式一·全链条流程：编号步骤依次排布，宽屏多列、窄屏单列 -->
  <div v-if="items.length">
    <SectionHeading v-if="heading" :heading="heading" :subheading="subheading" :on-dark="onDark" />
    <ol class="pf-list">
      <li v-for="(s, i) in items" :key="i" class="pf-item">
        <span class="pf-num" aria-hidden="true">{{ i + 1 }}</span>
        <h3 class="pf-title"><span class="sr-only">第 {{ i + 1 }} 步：</span>{{ s.title }}</h3>
        <p v-if="s.desc" class="pf-desc">{{ s.desc }}</p>
      </li>
    </ol>
  </div>
</template>

<script setup lang="ts">
// 全链条流程：只接收 extra.steps，数据由页面从条目 extra 取出后传入
import type { ExtraItem } from '@/api/page'
import SectionHeading from './SectionHeading.vue'

defineProps<{
  items: ExtraItem[]
  heading?: string
  subheading?: string
  onDark?: boolean
}>()
</script>

<style scoped>
.pf-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.pf-item {
  position: relative;
  padding: 24px 22px 22px;
  background: #fff;
  border: 1px solid var(--color-line);
  border-top: 3px solid var(--color-brand-600);
  border-radius: var(--radius-md);
}
.pf-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  margin-bottom: 14px;
  font-size: 15px;
  font-weight: 700;
  color: #fff;
  background: var(--color-brand-600);
  border-radius: var(--radius-pill);
}
.pf-title { margin: 0 0 8px; font-size: var(--text-fs-h4); font-weight: 600; line-height: 1.45; color: var(--color-ink-900); }
.pf-desc { margin: 0; font-size: 14px; line-height: 1.75; color: var(--color-ink-500); }
</style>
