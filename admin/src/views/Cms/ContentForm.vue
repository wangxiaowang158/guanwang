<template>
  <a-form ref="formRef" :model="model" :label-col="{ style: { width: '90px' } }" class="content-form">
    <a-form-item
      v-for="key in fields"
      :key="key"
      :label="defOf(key).label"
      :name="key"
      :rules="ruleOf(key)"
      :extra="hasInlineTip(key) ? undefined : defOf(key).tip"
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
      <RichEditor
        v-else-if="defOf(key).widget === 'richtext'"
        :model-value="textOf(key)"
        @update:model-value="(v) => (model[key] = v)"
      />
      <!-- 图片 -->
      <ImageUpload
        v-else-if="defOf(key).widget === 'image'"
        :model-value="textOf(key)"
        @update:model-value="(v) => (model[key] = v)"
        :tip="defOf(key).tip"
      />
      <!-- 视频 -->
      <VideoUpload
        v-else-if="defOf(key).widget === 'video'"
        :model-value="textOf(key)"
        @update:model-value="(v) => (model[key] = v)"
        :tip="defOf(key).tip"
      />
      <!-- 文件 -->
      <!-- 系统暂无文件上传通道：填写已有文件的访问地址，不放一个点了没反应的上传按钮 -->
      <a-input
        v-else-if="defOf(key).widget === 'file'"
        v-model:value="model[key]"
        placeholder="请输入文件访问地址"
      />
      <!-- 日期时间：由系统在保存时自动记录，只读展示，避免看似可改实则不生效 -->
      <a-input
        v-else-if="defOf(key).widget === 'datetime'"
        :value="model[key]"
        placeholder="保存后自动生成"
        disabled
      />
      <!-- 下拉选择：选项由父级按字段传入 -->
      <div v-else-if="defOf(key).widget === 'select'">
        <a-select
          v-model:value="model[key]"
          :options="optionsOf(key)"
          :placeholder="selectPlaceholder(key)"
          :disabled="!optionsOf(key).length"
          allow-clear
          show-search
        />
        <div v-if="defOf(key).tip" class="field-tip">{{ defOf(key).tip }}</div>
      </div>
      <!-- 置顶开关 -->
      <a-checkbox v-else-if="defOf(key).widget === 'switch'" v-model:checked="model[key]">
        置顶
      </a-checkbox>
      <!-- 兜底文本 -->
      <a-input v-else v-model:value="model[key]" />
    </a-form-item>

    <!-- 发布状态：固定字段，不随栏目 formFields 配置，每个栏目都需要暂存能力 -->
    <a-form-item label="发布状态" name="status">
      <a-radio-group v-model:value="model.status">
        <a-radio value="published">已发布</a-radio>
        <a-radio value="draft">草稿</a-radio>
      </a-radio-group>
      <div class="field-tip">草稿仅在后台可见，不会出现在官网前台</div>
    </a-form-item>

    <!-- 发布时间：与发布状态同为固定字段；只有列表类栏目有「发布日期」可展示，单条富文本栏目不传 showPublishAt -->
    <a-form-item v-if="showPublishAt" label="发布时间" name="publishAt">
      <a-date-picker
        v-model:value="model.publishAt"
        show-time
        value-format="YYYY-MM-DD HH:mm:ss"
        placeholder="请选择发布时间"
        allow-clear
      />
      <div class="field-tip">前台展示的发布日期，未填写时取创建日期</div>
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
import type { ContentFormModel } from '@/api/cms'
import { getFieldDef } from './fieldDefs'
import RichEditor from './components/RichEditor.vue'
import ImageUpload from './components/ImageUpload.vue'
import VideoUpload from './components/VideoUpload.vue'

const props = defineProps<{
  fields: string[]
  /** 所属栏目 key，用于按栏目覆盖字段标签（见 fieldDefs.ts） */
  channelKey?: string
  saving?: boolean
  showBack?: boolean
  /** 是否显示「发布时间」，列表类栏目开启 */
  showPublishAt?: boolean
  /** 下拉字段的选项，按字段 key 归档；由父级查好传入 */
  fieldOptions?: Record<string, { label: string; value: string }[]>
}>()
const emit = defineEmits<{ save: []; back: [] }>()

/** 表单模型由父级持有，经 v-model:model 双向绑定，字段在此就地编辑 */
const model = defineModel<ContentFormModel>('model', { required: true })

const formRef = ref()

const defOf = (key: string) => getFieldDef(key, props.channelKey)

/** 富文本、图片、视频字段的值只会是字符串，空值统一成 undefined 交给控件 */
const textOf = (key: string) => {
  const v = model.value[key]
  return typeof v === 'string' ? v : undefined
}

/** 图片/视频/下拉控件自带提示位，其余控件的提示走表单项的 extra，避免重复显示 */
const hasInlineTip = (key: string) => ['image', 'video', 'select'].includes(defOf(key).widget)

/** 取某下拉字段的选项，父级未提供时为空数组（控件随之禁用） */
const optionsOf = (key: string) => props.fieldOptions?.[key] ?? defOf(key).options ?? []

/**
 * 下拉框占位文案
 * 无选项时说明原因而非只写「请选择」：该字段的选项来自另一个栏目，
 * 那个栏目还没录内容时这里必然是空的，直接写「请选择」会让人以为是故障
 */
const selectPlaceholder = (key: string) => {
  if (optionsOf(key).length) return `请选择${defOf(key).label}`
  // 固定选项的字段不会为空；为空只可能是「选项来自另一个栏目」且那边还没录
  return `请先在对应分类栏目录入${defOf(key).label}`
}

// 必填字段生成校验规则
const ruleOf = (key: string): Rule[] => {
  const def = defOf(key)
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

/* 字段下方的补充说明，弱化处理不与正文争视觉重量 */
.field-tip {
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.5;
  color: #8c8c8c;
}

/* 操作按钮靠右对齐到表单右边缘 */
.form-actions :deep(.ant-form-item-control-input-content) {
  display: flex;
  justify-content: flex-end;
}

</style>
