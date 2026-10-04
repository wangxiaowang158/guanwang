<template>
  <!-- 区块页码：上一页 / 页码 / 下一页；页数多时中间以省略号收起 -->
  <nav class="pager" :class="{ 'pager--style2': style2, 'pager--dark': onDark }" :aria-label="`${label}分页`">
    <button type="button" class="pager-btn" :disabled="current <= 1 || loading" aria-label="上一页" @click="$emit('change', current - 1)">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
    </button>
    <template v-for="(p, i) in pages" :key="`${p}-${i}`">
      <span v-if="p === GAP" class="pager-gap" aria-hidden="true">…</span>
      <button
        v-else
        type="button"
        class="pager-btn tabular-nums"
        :class="{ 'is-current': p === current }"
        :aria-current="p === current ? 'page' : undefined"
        :aria-label="`第 ${p} 页`"
        :disabled="loading"
        @click="p !== current && $emit('change', p)"
      >{{ p }}</button>
    </template>
    <button type="button" class="pager-btn" :disabled="current >= total || loading" aria-label="下一页" @click="$emit('change', current + 1)">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
    </button>
  </nav>
</template>

<script setup lang="ts">
// 分页器：受控组件，当前页与总页数由父级给出，点击只抛出目标页码
import { computed } from 'vue'

const props = defineProps<{
  current: number
  total: number
  /** 区块名称，给读屏软件区分同页多个分页器 */
  label: string
  loading?: boolean
  style2?: boolean
  onDark?: boolean
}>()

defineEmits<{ change: [page: number] }>()

/** 省略号占位 */
const GAP = -1

/**
 * 页码序列：首页、末页、当前页前后各 1 页，其余收起为省略号
 * 总页数 ≤ 7 时全部展示
 */
const pages = computed<number[]>(() => {
  const { current, total } = props
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const set = new Set([1, total, current - 1, current, current + 1].filter(p => p >= 1 && p <= total))
  const sorted = [...set].sort((a, b) => a - b)
  const result: number[] = []
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) result.push(GAP)
    result.push(p)
  })
  return result
})
</script>

<style scoped>
.pager {
  --pager-accent: var(--color-brand-600);
  --pager-radius: var(--radius-md);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-top: 40px;
}
.pager--style2 { --pager-accent: var(--rs-primary); --pager-radius: 0; }
.pager-btn {
  min-width: 40px;
  height: 40px;
  padding: 0 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: var(--color-ink-700);
  background: #fff;
  border: 1px solid var(--color-line);
  border-radius: var(--pager-radius);
  cursor: pointer;
  transition: color var(--dur-fast), border-color var(--dur-fast), background var(--dur-fast);
}
.pager-btn:hover:not(:disabled):not(.is-current) { color: var(--pager-accent); border-color: var(--pager-accent); }
.pager-btn.is-current { color: #fff; background: var(--pager-accent); border-color: var(--pager-accent); cursor: default; }
.pager-btn:disabled:not(.is-current) { opacity: 0.4; cursor: not-allowed; }
.pager-gap { padding: 0 4px; color: var(--color-ink-400); }

.pager--dark .pager-btn:not(.is-current) { color: #fff; background: rgba(255, 255, 255, 0.08); border-color: rgba(255, 255, 255, 0.3); }
.pager--dark .pager-btn.is-current { color: var(--color-ink-900); background: #fff; border-color: #fff; }
.pager--dark .pager-gap { color: rgba(255, 255, 255, 0.6); }
</style>
