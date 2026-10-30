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
  padding: 32px 28px;
  /* 无描边无 hover 阴影：底色与区块错开分层 */
  background: var(--section-card, var(--color-surface));
  border-radius: var(--radius-xl);
}
/* 苹果风格不用色条装饰，靠标题字号区分层次 */
.cm-mark { display: none; }
.cm-title { margin: 0 0 10px; font-size: var(--text-fs-h3); font-weight: 700; line-height: 1.3; color: var(--color-ink-900); }
.cm-desc { margin: 0; font-size: 14px; line-height: 1.75; color: var(--color-ink-500); }
</style>
