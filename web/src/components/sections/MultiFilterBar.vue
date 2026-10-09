<template>
  <!-- 多维组合筛选条：每个维度一行，选项可多选；末尾「清空筛选」恢复全部 -->
  <div class="mf" :class="{ 'mf--style2': style2, 'mf--dark': onDark }" role="group" aria-label="组合筛选" :aria-busy="loading">
    <div v-for="dim in visibleDimensions" :key="dim.key" class="mf-row" role="group" :aria-label="dim.label">
      <span class="mf-label">{{ dim.label }}</span>
      <div class="mf-options">
        <button
          v-for="opt in dim.options"
          :key="opt.value"
          type="button"
          class="mf-btn"
          :class="{ 'is-active': isSelected(dim.key, opt.value) }"
          :disabled="loading"
          :aria-pressed="isSelected(dim.key, opt.value)"
          @click="$emit('toggle', { dimension: dim.key, value: opt.value })"
        >{{ opt.label }}</button>
      </div>
    </div>
    <div class="mf-foot">
      <button v-if="selectedCount > 0" type="button" class="mf-clear" :disabled="loading" @click="$emit('clear')">
        清空筛选（已选 {{ selectedCount }} 项）
      </button>
      <!-- 结果数变化时读屏播报，视觉上不占位 -->
      <span class="sr-only" role="status" aria-live="polite">{{ loading ? '正在筛选' : '' }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
// 多维组合筛选条：受控组件，选中态与加载态由父级持有（配合 useMultiFilter）；配色跟随模板与底色
import { computed } from 'vue'
import type { FilterDimension } from '@/composables/useMultiFilter'
import type { FilterOption } from './ChannelFilterBar.vue'

/** 单个筛选维度及其可选项 */
export interface FilterDimensionDef {
  key: FilterDimension
  /** 维度名，如「业务线」「行业」「标签」 */
  label: string
  options: FilterOption[]
}

const props = defineProps<{
  /** 维度定义，选项为空的维度自动不渲染 */
  dimensions: FilterDimensionDef[]
  /** 各维度当前已选取值 */
  selected: Record<FilterDimension, string[]>
  onDark?: boolean
  loading?: boolean
  style2?: boolean
}>()

defineEmits<{
  toggle: [payload: { dimension: FilterDimension; value: string }]
  clear: []
}>()

const visibleDimensions = computed(() => props.dimensions.filter(d => d.options.length > 0))
const selectedCount = computed(() => props.selected.business.length + props.selected.industry.length + props.selected.tag.length)
const isSelected = (dim: FilterDimension, value: string) => props.selected[dim].includes(value)
</script>

<style scoped>
.mf {
  --mf-accent: var(--color-brand-600);
  --mf-radius: var(--radius-pill);
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-bottom: 32px;
}
.mf--style2 { --mf-accent: var(--rs-primary); --mf-radius: 0; }
.mf-row { display: flex; align-items: flex-start; gap: 16px; }
.mf-label {
  flex-shrink: 0;
  width: 56px;
  padding-top: 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-ink-900);
}
.mf-options { display: flex; flex-wrap: wrap; gap: 10px; }
.mf-btn {
  height: 36px;
  padding: 0 16px;
  font-size: 14px;
  color: var(--color-ink-700);
  background: #fff;
  border: 1px solid var(--color-line);
  border-radius: var(--mf-radius);
  cursor: pointer;
  transition: color var(--dur-fast), border-color var(--dur-fast), background var(--dur-fast);
}
.mf-btn:hover:not(.is-active):not(:disabled) { color: var(--mf-accent); border-color: var(--mf-accent); }
.mf-btn.is-active { color: #fff; background: var(--mf-accent); border-color: var(--mf-accent); font-weight: 500; }
.mf-btn:disabled { cursor: progress; }
.mf-btn:disabled:not(.is-active) { opacity: 0.6; }
.mf-foot { padding-left: 72px; }
.mf-clear {
  padding: 4px 0;
  font-size: 13px;
  color: var(--mf-accent);
  background: none;
  border: 0;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 3px;
}
.mf-clear:disabled { cursor: progress; opacity: 0.6; }

/* 背景图区块：改用白色描边与白字，深色底上品牌色对比度不足 */
.mf--dark .mf-label { color: #fff; }
.mf--dark .mf-btn:not(.is-active) { color: #fff; background: rgba(255, 255, 255, 0.1); border-color: rgba(255, 255, 255, 0.4); }
.mf--dark .mf-btn.is-active { color: var(--color-ink-900); background: #fff; border-color: #fff; }
.mf--dark .mf-clear { color: #fff; }

@media (max-width: 640px) {
  .mf-row { flex-direction: column; gap: 6px; }
  .mf-label { width: auto; padding-top: 0; }
  .mf-foot { padding-left: 0; }
}
</style>
