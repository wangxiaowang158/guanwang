<template>
  <div class="cover-field">
    <div class="cover-thumb" :class="{ 'cover-thumb--empty': !modelValue }">
      <img v-if="modelValue" :src="modelValue" alt="封面预览" width="160" height="107" />
      <span v-else>未设置</span>
    </div>
    <div class="cover-actions">
      <a-space>
        <a-button @click="pickerOpen = true">{{ modelValue ? '更换封面' : '选择封面' }}</a-button>
        <a-button v-if="modelValue" danger @click="emit('update:modelValue', '')">清除</a-button>
      </a-space>
      <span v-if="tip" class="tip">{{ tip }}</span>
    </div>

    <CoverPickerModal
      v-model:open="pickerOpen"
      @confirm="(url) => emit('update:modelValue', url)"
    />
  </div>
</template>

<script setup lang="ts">
// 封面图字段控件：缩略图 + 打开选择弹窗的按钮，素材库 / 上传 / AI 生成都在弹窗内
import { ref } from 'vue'
import CoverPickerModal from './CoverPickerModal.vue'

defineProps<{ modelValue?: string; tip?: string }>()
const emit = defineEmits<{ 'update:modelValue': [string] }>()

const pickerOpen = ref(false)
</script>

<style scoped>
.cover-field {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.cover-thumb {
  width: 160px;
  height: 107px;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  overflow: hidden;
  background: #fafafa;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cover-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cover-thumb--empty {
  color: #bfbfbf;
  border-style: dashed;
}

.cover-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tip {
  color: #8c8c8c;
  font-size: 12px;
}
</style>
