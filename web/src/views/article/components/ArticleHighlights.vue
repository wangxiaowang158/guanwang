<template>
  <!-- 案例关键指标条：标题下方先给结论（节能率、年节省、回收期…），读者不必翻到页尾才知道效果 -->
  <dl class="ah" :class="{ 'ah--s2': style2 }" aria-label="项目关键成效">
    <div v-for="m in items" :key="m.label" class="ah-item">
      <dt class="ah-label">{{ m.label }}</dt>
      <dd class="ah-value">
        <span class="tabular-nums">{{ m.value }}</span><span v-if="m.unit" class="ah-unit">{{ m.unit }}</span>
      </dd>
    </div>
  </dl>
</template>

<script setup lang="ts">
// 只取前 4 个量化指标：一行放得下，多了就和下方的「量化收益」区块重复
import type { ExtraMetric } from '@/api/page'

defineProps<{ items: ExtraMetric[]; style2?: boolean }>()
</script>

<style scoped>
.ah {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1px;
  margin: 28px 0 0;
  overflow: hidden;
  background: var(--color-line);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-lg);
}
@media (min-width: 768px) {
  .ah { grid-template-columns: repeat(var(--ah-cols, 4), minmax(0, 1fr)); }
}
.ah--s2 { border-radius: 0; }
.ah-item { padding: 18px 20px; background: var(--color-surface, #f7f9fc); }
.ah-label { margin: 0 0 6px; font-size: var(--text-fs-caption, 13px); color: var(--color-ink-500); }
.ah-value { margin: 0; font-size: clamp(24px, 2.6vw, 32px); font-weight: 700; line-height: 1.2; color: var(--color-brand-600); }
.ah--s2 .ah-value { color: var(--rs-primary); }
.ah-unit { margin-left: 2px; font-size: 0.5em; font-weight: 600; }
</style>
