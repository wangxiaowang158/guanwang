<template>
  <div class="extra-list">
    <div v-for="(row, index) in modelValue" :key="index" class="row">
      <div class="row-head">
        <span class="row-no">{{ index + 1 }}</span>
        <a-space :size="4">
          <a-button type="text" size="small" :disabled="index === 0" aria-label="上移" @click="move(index, -1)">
            <template #icon><ArrowUpOutlined /></template>
          </a-button>
          <a-button
            type="text"
            size="small"
            :disabled="index === modelValue.length - 1"
            aria-label="下移"
            @click="move(index, 1)"
          >
            <template #icon><ArrowDownOutlined /></template>
          </a-button>
          <a-button type="text" size="small" danger aria-label="删除" @click="remove(index)">
            <template #icon><DeleteOutlined /></template>
          </a-button>
        </a-space>
      </div>
      <div class="row-body">
        <div
          v-for="col in columns"
          :key="col.key"
          class="cell"
          :class="{ 'cell-wide': col.type !== 'input' }"
        >
          <label class="cell-label">{{ col.label }}<i v-if="col.required" class="req">*</i></label>
          <ImageUpload
            v-if="col.type === 'image'"
            :model-value="row[col.key]"
            @update:model-value="(v) => setCell(index, col.key, v)"
          />
          <a-textarea
            v-else-if="col.type === 'textarea'"
            :value="row[col.key]"
            :rows="2"
            :maxlength="col.maxlength"
            :placeholder="col.placeholder"
            @update:value="(v: string) => setCell(index, col.key, v)"
          />
          <a-input
            v-else
            :value="row[col.key]"
            :maxlength="col.maxlength"
            :placeholder="col.placeholder"
            @update:value="(v: string) => setCell(index, col.key, v)"
          />
        </div>
      </div>
    </div>

    <a-button type="dashed" block :disabled="modelValue.length >= MAX_ROWS" @click="add">
      <template #icon><PlusOutlined /></template>
      {{ addText || '新增一条' }}（{{ modelValue.length }}/{{ MAX_ROWS }}）
    </a-button>
  </div>
</template>

<script setup lang="ts">
// 扩展字段通用行编辑器：按列配置渲染每行，可新增、删除、上下移；条数上限 30
import { ArrowUpOutlined, ArrowDownOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons-vue'
import ImageUpload from '../ImageUpload.vue'
import { EXTRA_MAX_ROWS as MAX_ROWS, type ExtraColumn, type ExtraRow } from './extraDraft'

const props = defineProps<{
  modelValue: ExtraRow[]
  columns: ExtraColumn[]
  addText?: string
}>()
const emit = defineEmits<{ 'update:modelValue': [ExtraRow[]] }>()

/** 新增空行，所有列初始为空串 */
const add = () => {
  if (props.modelValue.length >= MAX_ROWS) return
  const blank: ExtraRow = {}
  for (const col of props.columns) blank[col.key] = ''
  emit('update:modelValue', [...props.modelValue, blank])
}

const remove = (index: number) => {
  emit('update:modelValue', props.modelValue.filter((_, i) => i !== index))
}

/** 与相邻行交换位置，越界忽略 */
const move = (index: number, step: -1 | 1) => {
  const target = index + step
  if (target < 0 || target >= props.modelValue.length) return
  const next = [...props.modelValue]
  ;[next[index], next[target]] = [next[target], next[index]]
  emit('update:modelValue', next)
}

/** 改单元格：只替换被改的那一行，其余行引用不变 */
const setCell = (index: number, key: string, value: string) => {
  emit(
    'update:modelValue',
    props.modelValue.map((row, i) => (i === index ? { ...row, [key]: value } : row)),
  )
}
</script>

<style scoped>
.extra-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.row {
  padding: 8px 12px 12px;
  background: #fafafa;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
}

.row-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.row-no {
  font-size: 12px;
  color: #8c8c8c;
}

.row-body {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
}

.cell {
  flex: 1 1 180px;
  min-width: 0;
}

/* 多行文本与图片独占一行 */
.cell-wide {
  flex-basis: 100%;
}

.cell-label {
  display: block;
  margin-bottom: 4px;
  font-size: 12px;
  color: #595959;
}

.req {
  margin-left: 2px;
  font-style: normal;
  color: #ff4d4f;
}
</style>
