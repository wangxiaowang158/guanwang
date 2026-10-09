<template>
  <!-- 样式二·全链条流程：大号序号 + 直角分格，两列排布 -->
  <div v-if="items.length">
    <Style2SectionHead :heading="heading" :subheading="subheading" :on-dark="onDark" />
    <ol class="rs-pf-list">
      <li v-for="(s, i) in items" :key="i" class="rs-pf-item">
        <span class="rs-pf-num" aria-hidden="true">{{ String(i + 1).padStart(2, '0') }}</span>
        <div>
          <h3 class="rs-pf-title"><span class="sr-only">第 {{ i + 1 }} 步：</span>{{ s.title }}</h3>
          <p v-if="s.desc" class="rs-pf-desc">{{ s.desc }}</p>
        </div>
      </li>
    </ol>
  </div>
</template>

<script setup lang="ts">
// 样式二全链条流程：props 约定同 ProcessFlow
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
.rs-pf-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1px;
  margin: 0;
  padding: 0;
  list-style: none;
  background: var(--rs-border);
  border: 1px solid var(--rs-border);
}
.rs-pf-item { display: flex; align-items: flex-start; gap: 20px; padding: 28px; background: #fff; }
.rs-pf-num { flex-shrink: 0; font-size: 32px; font-weight: 800; line-height: 1; color: var(--rs-primary); }
.rs-pf-title { margin: 0 0 8px; font-size: 16px; font-weight: 700; color: var(--rs-text-dark); }
.rs-pf-desc { margin: 0; font-size: 14px; line-height: 1.75; color: var(--rs-text-muted); }
</style>
