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
      <!-- 封面图：素材库 / 本地上传 / AI 生成 -->
      <CoverUpload
        v-else-if="defOf(key).widget === 'cover'"
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
      <!-- 附件：上传 PDF / Office 文档，写回站内地址；前台显示为下载按钮 -->
      <FileUpload
        v-else-if="defOf(key).widget === 'file'"
        :model-value="textOf(key)"
        @update:model-value="(v) => (model[key] = v)"
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
      <!-- 扩展字段：读写 extra 草稿，不进 model -->
      <a-select
        v-else-if="defOf(key).widget === 'extra-business'"
        v-model:value="extra.business"
        :options="BUSINESS_LINE_OPTIONS"
        placeholder="请选择业务线"
        allow-clear
      />
      <ExtraTagsInput
        v-else-if="defOf(key).widget === 'extra-tags'"
        :model-value="tagsOf(key)"
        @update:model-value="(v) => setTags(key, v)"
      />
      <ExtraQuoteInput
        v-else-if="defOf(key).widget === 'extra-quote'"
        v-model="extra.quote"
      />
      <ExtraListEditor
        v-else-if="isListWidget(defOf(key).widget)"
        :model-value="rowsOf(key)"
        :columns="columnsOf(key)"
        :add-text="`新增${defOf(key).label}`"
        @update:model-value="(v) => setRows(key, v)"
      />
      <!-- 兜底文本 -->
      <a-input v-else v-model:value="model[key]" />
    </a-form-item>

    <!-- 当前状态只展示；改状态走底部按钮，「发布」是明确的动作，不会顺手点保存就上线 -->
    <a-form-item label="当前状态">
      <a-tag :color="isPublished ? 'green' : 'default'">{{ isPublished ? '已发布' : '草稿' }}</a-tag>
      <span class="field-tip status-tip">
        {{ isPublished ? '官网可见，修改保存后即更新' : '仅后台可见，官网不显示；点「发布到官网」后上线' }}
      </span>
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
      <div class="field-tip">官网显示的日期，留空取创建日期；不是定时发布，填未来时间也会立即上线</div>
    </a-form-item>

    <a-form-item :wrapper-col="{ offset: 0 }" class="form-actions">
      <a-space>
        <a-button v-if="showBack" @click="$emit('back')">返回列表</a-button>
        <!-- 草稿：存草稿 / 发布；已发布：撤回 / 保存修改（保持已发布） -->
        <template v-if="isPublished">
          <a-button :disabled="saving" @click="onSave('draft')">撤回为草稿</a-button>
          <a-button type="primary" :loading="saving" @click="onSave('published')">保存修改</a-button>
        </template>
        <template v-else>
          <a-button :disabled="saving" @click="onSave('draft')">保存草稿</a-button>
          <a-button type="primary" :loading="saving" @click="onSave('published')">发布到官网</a-button>
        </template>
      </a-space>
    </a-form-item>
  </a-form>
</template>

<script setup lang="ts">
// 通用内容表单：按栏目 formFields 渲染字段，保存前做必填校验
import { computed, ref } from 'vue'
import type { Rule } from 'ant-design-vue/es/form'
import type { ContentFormModel } from '@/api/cms'
import { BUSINESS_LINE_OPTIONS } from '@/api/cms'
import { getFieldDef, isExtraField, type FieldWidget } from './fieldDefs'
import RichEditor from './components/RichEditor.vue'
import ImageUpload from './components/ImageUpload.vue'
import CoverUpload from './components/CoverUpload.vue'
import VideoUpload from './components/VideoUpload.vue'
import FileUpload from './components/FileUpload.vue'
import ExtraTagsInput from './components/extra/ExtraTagsInput.vue'
import ExtraListEditor from './components/extra/ExtraListEditor.vue'
import ExtraQuoteInput from './components/extra/ExtraQuoteInput.vue'
import { EXTRA_COLUMNS, type ExtraDraft, type ExtraRow } from './components/extra/extraDraft'

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
/** save 携带本次要保存成的状态，父级据此提交并给出对应提示 */
const emit = defineEmits<{ save: [status: 'published' | 'draft']; back: [] }>()

/** 表单模型由父级持有，经 v-model:model 双向绑定，字段在此就地编辑 */
const model = defineModel<ContentFormModel>('model', { required: true })

/**
 * 扩展字段草稿（对应 content.extra），由父级持有并在保存时经 draftToExtra 组装
 * 与 model 分开：model 只装 content 顶层列，扩展字段的值是数组/对象，混进去会破坏其类型约束
 */
const extra = defineModel<ExtraDraft>('extra', { required: true })

const formRef = ref()

type ListKey = 'metrics' | 'pains' | 'steps' | 'modes' | 'facts' | 'gallery'

/** 列表型扩展控件：指标、痛点、条目、键值、多图 */
const isListWidget = (w: FieldWidget) =>
  ['extra-metrics', 'extra-pains', 'extra-items', 'extra-facts', 'extra-gallery'].includes(w)

/** 标签型字段只有 industries / tags 两个 */
const tagsOf = (key: string): string[] => (key === 'industries' ? extra.value.industries : extra.value.tags)
const setTags = (key: string, v: string[]) => {
  if (key === 'industries') extra.value.industries = v
  else extra.value.tags = v
}

const rowsOf = (key: string): ExtraRow[] => (isExtraField(key) && key in EXTRA_COLUMNS ? extra.value[key as ListKey] : [])
const columnsOf = (key: string) => EXTRA_COLUMNS[key as ListKey] ?? []
const setRows = (key: string, v: ExtraRow[]) => {
  if (isExtraField(key) && key in EXTRA_COLUMNS) extra.value[key as ListKey] = v
}

const defOf = (key: string) => getFieldDef(key, props.channelKey)

/** 富文本、图片、视频字段的值只会是字符串，空值统一成 undefined 交给控件 */
const textOf = (key: string) => {
  const v = model.value[key]
  return typeof v === 'string' ? v : undefined
}

/** 图片/视频/下拉控件自带提示位，其余控件的提示走表单项的 extra，避免重复显示 */
const hasInlineTip = (key: string) => ['image', 'cover', 'video', 'select'].includes(defOf(key).widget)

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

/** 已保存的状态；按钮组按它切换（未保存的新内容视为草稿） */
const isPublished = computed(() => model.value.status === 'published')

const onSave = async (status: 'published' | 'draft') => {
  // 存草稿不卡必填：半成品也要能先存下来，发布时才校验完整
  if (status === 'published') {
    try {
      await formRef.value?.validate()
    } catch {
      return
    }
  }
  emit('save', status)
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

.status-tip {
  margin-left: 4px;
}

/* 操作按钮靠右对齐到表单右边缘 */
.form-actions :deep(.ant-form-item-control-input-content) {
  display: flex;
  justify-content: flex-end;
}

</style>
