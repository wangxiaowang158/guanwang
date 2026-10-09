<template>
  <div class="extra-quote">
    <a-textarea
      :value="modelValue.text"
      :rows="3"
      :maxlength="1000"
      placeholder="证言内容，留空则不保存该证言"
      @update:value="(v: string) => set('text', v)"
    />
    <div class="quote-meta">
      <a-input
        :value="modelValue.author"
        :maxlength="100"
        placeholder="署名，如 王经理"
        @update:value="(v: string) => set('author', v)"
      />
      <a-input
        :value="modelValue.org"
        :maxlength="100"
        placeholder="单位，如 某某集团"
        @update:value="(v: string) => set('org', v)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
// 客户证言：证言正文 + 署名 + 单位
import type { ExtraRow } from './extraDraft'

const props = defineProps<{ modelValue: ExtraRow }>()
const emit = defineEmits<{ 'update:modelValue': [ExtraRow] }>()

const set = (key: 'text' | 'author' | 'org', value: string) => {
  emit('update:modelValue', { ...props.modelValue, [key]: value })
}
</script>

<style scoped>
.quote-meta {
  display: flex;
  gap: 12px;
  margin-top: 8px;
}
</style>
