<template>
  <!-- 栏目页分类筛选条：选项来自分类栏目的条目，「全部」为默认态 -->
  <div class="filter" :class="{ 'filter--style2': style2, 'filter--dark': onDark }" role="group" aria-label="分类筛选" :aria-busy="loading">
    <button
      v-for="opt in allOptions"
      :key="opt.value"
      type="button"
      class="filter-btn"
      :class="{ 'is-active': opt.value === active }"
      :disabled="loading"
      :aria-pressed="opt.value === active"
      @click="opt.value !== active && $emit('select', opt.value)"
    >{{ opt.label }}</button>
  </div>
</template>

<script setup lang="ts">
// 分类筛选条：受控组件，选中态与加载态由父级持有；配色跟随模板与所处底色
import { computed } from 'vue'

/** 单个筛选项，value 为空串表示「全部」 */
export interface FilterOption {
  label: string
  value: string
}

const props = defineProps<{
  options: FilterOption[]
  /** 当前选中值，空串为「全部」 */
  active: string
  onDark?: boolean
  loading?: boolean
  style2?: boolean
}>()

defineEmits<{ select: [value: string] }>()

// 「全部」恒在首位，由本组件补而非要求调用方拼
const allOptions = computed<FilterOption[]>(() => [{ label: '全部', value: '' }, ...props.options])
</script>

<style scoped>
.filter {
  --filter-accent: var(--color-brand-600);
  --filter-radius: var(--radius-pill);
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
  margin-bottom: 32px;
}
.filter--style2 { --filter-accent: var(--rs-primary); --filter-radius: 0; justify-content: flex-start; }
.filter-btn {
  height: 38px;
  padding: 0 18px;
  font-size: 14px;
  color: var(--color-ink-700);
  background: #fff;
  border: 1px solid var(--color-line);
  border-radius: var(--filter-radius);
  cursor: pointer;
  transition: color var(--dur-fast), border-color var(--dur-fast), background var(--dur-fast);
}
.filter-btn:hover:not(.is-active):not(:disabled) { color: var(--filter-accent); border-color: var(--filter-accent); }
.filter-btn.is-active { color: #fff; background: var(--filter-accent); border-color: var(--filter-accent); font-weight: 500; }
.filter-btn:disabled { cursor: progress; }
.filter-btn:disabled:not(.is-active) { opacity: 0.6; }

/* 背景图区块：一律白色描边，深色底上的品牌色描边对比度不足 */
.filter--dark .filter-btn:not(.is-active) { color: #fff; background: rgba(255, 255, 255, 0.1); border-color: rgba(255, 255, 255, 0.4); }
.filter--dark .filter-btn.is-active { color: var(--color-ink-900); background: #fff; border-color: #fff; }
</style>
