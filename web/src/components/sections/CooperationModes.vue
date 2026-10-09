<template>
  <!-- 样式一·合作模式：并列卡片，不带顺序编号（与流程区分） -->
  <div v-if="items.length">
    <SectionHeading v-if="heading" :heading="heading" :subheading="subheading" :on-dark="onDark" />
    <ul class="cm-list">
      <li v-for="(m, i) in items" :key="i" class="cm-item">
        <span class="cm-mark" aria-hidden="true"></span>
        <h3 class="cm-title">{{ m.title }}</h3>
        <p v-if="m.desc" class="cm-desc">{{ m.desc }}</p>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
// 合作模式：只接收 extra.modes，数据由页面从条目 extra 取出后传入
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
.cm-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.cm-item {
  padding: 28px 24px;
  background: #fff;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-lg);
  transition: border-color var(--dur-base), box-shadow var(--dur-base);
}
.cm-item:hover { border-color: var(--color-brand-200); box-shadow: var(--shadow-2); }
.cm-mark { display: block; width: 28px; height: 4px; margin-bottom: 18px; background: var(--color-brand-600); border-radius: var(--radius-pill); }
.cm-title { margin: 0 0 10px; font-size: var(--text-fs-h3); font-weight: 600; line-height: 1.4; color: var(--color-ink-900); }
.cm-desc { margin: 0; font-size: 14px; line-height: 1.75; color: var(--color-ink-500); }
</style>
