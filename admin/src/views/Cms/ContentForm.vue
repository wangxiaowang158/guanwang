<template>
  <a-form ref="formRef" :model="model" :label-col="{ style: { width: '90px' } }" class="content-form">
    <a-form-item
      v-for="key in fields"
      :key="key"
      :label="defOf(key).label"
      :name="key"
      :rules="ruleOf(key)"
    >
      <!-- 文本 -->
      <a-input
        v-if="defOf(key).widget === 'text'"
        v-model:value="model[key]"
        :maxlength="defOf(key).maxlength"
        :placeholder="`请输入${defOf(key).label}`"
      />
      <!-- 多行文本 -->
      <a-textarea
        v-else-if="defOf(key).widget === 'textarea'"
        v-model:value="model[key]"
        :maxlength="defOf(key).maxlength"
        :rows="3"
        :placeholder="`请输入${defOf(key).label}`"
      />
      <!-- 链接 -->
      <a-input
        v-else-if="defOf(key).widget === 'link'"
        v-model:value="model[key]"
        placeholder="请输入链接地址"
      />
      <!-- 富文本 -->
      <RichEditor v-else-if="defOf(key).widget === 'richtext'" v-model="model[key]" />
      <!-- 图片 -->
      <ImageUpload
        v-else-if="defOf(key).widget === 'image'"
        v-model="model[key]"
        :tip="defOf(key).tip"
      />
      <!-- 文件 -->
      <div v-else-if="defOf(key).widget === 'file'" class="file-row">
        <a-input v-model:value="model[key]" placeholder="文件地址" readonly />
        <a-button>上传文件</a-button>
      </div>
      <!-- 日期时间 -->
      <a-input
        v-else-if="defOf(key).widget === 'datetime'"
        v-model:value="model[key]"
        placeholder="自动生成"
      />
      <!-- 置顶开关 -->
      <a-checkbox v-else-if="defOf(key).widget === 'switch'" v-model:checked="model[key]">
        置顶
      </a-checkbox>
      <!-- 兜底文本 -->
      <a-input v-else v-model:value="model[key]" />
    </a-form-item>

    <a-form-item :wrapper-col="{ offset: 0 }" class="form-actions">
      <a-space>
        <a-button type="primary" :loading="saving" @click="onSave">保存</a-button>
        <a-button v-if="showBack" @click="$emit('back')">返回列表</a-button>
      </a-space>
    </a-form-item>
  </a-form>
</template>

<script setup lang="ts">
// 通用内容表单：按栏目 formFields 渲染字段，保存前做必填校验
import { ref } from 'vue'
import type { Rule } from 'ant-design-vue/es/form'
import { getFieldDef } from './fieldDefs'
import RichEditor from './components/RichEditor.vue'
import ImageUpload from './components/ImageUpload.vue'

const props = defineProps<{
  fields: string[]
  model: Record<string, any>
  saving?: boolean
  showBack?: boolean
}>()
const emit = defineEmits<{ save: []; back: [] }>()

const formRef = ref()

const defOf = (key: string) => getFieldDef(key)

// 必填字段生成校验规则
const ruleOf = (key: string): Rule[] => {
  const def = getFieldDef(key)
  return def.required ? [{ required: true, message: `请填写${def.label}`, trigger: 'blur' }] : []
}

const onSave = async () => {
  try {
    await formRef.value?.validate()
  } catch {
    return
  }
  emit('save')
}
</script>

<style scoped>
.content-form {
  max-width: 920px;
}

.file-row {
  display: flex;
  gap: 8px;
}

/* 操作按钮靠右对齐到表单右边缘 */
.form-actions :deep(.ant-form-item-control-input-content) {
  display: flex;
  justify-content: flex-end;
}

</style>
