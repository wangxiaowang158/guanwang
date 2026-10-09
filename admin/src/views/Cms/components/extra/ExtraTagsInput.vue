<template>
  <div class="extra-tags">
    <div v-if="modelValue.length" class="tag-list">
      <a-tag v-for="tag in modelValue" :key="tag" closable @close="remove(tag)">{{ tag }}</a-tag>
    </div>
    <a-input
      v-model:value="draft"
      :maxlength="MAX_TAG_LENGTH"
      :disabled="modelValue.length >= MAX_TAG_COUNT"
      :placeholder="placeholder || '输入后回车添加'"
      @press-enter="onEnter"
      @blur="add"
    />
    <div class="count">{{ modelValue.length }}/{{ MAX_TAG_COUNT }}</div>
  </div>
</template>

<script setup lang="ts">
// 多标签输入：回车或失焦添加、点击 × 删除；限 30 个，每个 30 字，重复项提示并忽略
import { ref } from 'vue'
import { message } from 'ant-design-vue'

/** 标签数量上限，与后端 normalizeExtra 一致 */
const MAX_TAG_COUNT = 30
/** 单个标签字数上限，与后端 normalizeExtra 一致 */
const MAX_TAG_LENGTH = 30

const props = defineProps<{ modelValue: string[]; placeholder?: string }>()
const emit = defineEmits<{ 'update:modelValue': [string[]] }>()

const draft = ref('')

/** 添加：去空白、去重、受数量上限约束；失焦时也走这里，避免输入后直接点保存而丢字 */
const add = () => {
  const text = draft.value.trim()
  draft.value = ''
  if (!text || props.modelValue.length >= MAX_TAG_COUNT) return
  if (props.modelValue.includes(text)) {
    message.warning('该标签已存在')
    return
  }
  emit('update:modelValue', [...props.modelValue, text])
}

/** 回车添加；输入法选词时的回车（组合态）不算 */
const onEnter = (e: KeyboardEvent) => {
  if (e.isComposing) return
  add()
}

const remove = (tag: string) => {
  emit('update:modelValue', props.modelValue.filter(t => t !== tag))
}
</script>

<style scoped>
.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 0;
  margin-bottom: 8px;
}

.count {
  margin-top: 4px;
  font-size: 12px;
  color: #8c8c8c;
  text-align: right;
}
</style>
