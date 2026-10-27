<template>
  <!-- 高级设置：栏目标识、图标、编辑字段、列表列 —— 搭建站点时配一次，日常运营无需改动，默认收起 -->
  <a-collapse v-model:active-key="active" ghost class="adv">
    <a-collapse-panel key="adv" header="高级设置（建站时配置，日常无需改动）">
      <a-form-item label="栏目标识" :required="!model.id">
        <a-input
          v-model:value="model.key"
          placeholder="英文标识，小写字母开头，如 news-list"
          :disabled="!!model.id"
        />
        <div class="field-tip">{{ model.id ? '创建后不可修改' : '系统内部识别用，不会显示在官网上' }}</div>
      </a-form-item>
      <a-form-item label="菜单图标">
        <a-input v-model:value="model.icon" placeholder="如 HomeOutlined，留空用默认图标" />
        <div class="field-tip">后台左侧菜单的图标名，可在 Ant Design 图标库查找</div>
      </a-form-item>
      <template v-if="model.type === 'list' || model.type === 'single'">
        <a-form-item label="编辑字段">
          <a-checkbox-group v-model:value="model.formFields" :options="fieldOptions" />
          <div class="field-tip">勾选后，编辑该栏目内容时才会出现对应输入项</div>
        </a-form-item>
        <a-form-item label="扩展字段">
          <a-checkbox-group v-model:value="model.formFields" :options="EXTRA_FIELD_OPTIONS" />
          <div class="field-tip">存放业务线、行业、标签、指标等结构化信息，不占用基础字段</div>
        </a-form-item>
      </template>
      <a-form-item v-if="model.type === 'list'" label="列表列">
        <a-checkbox-group v-model:value="model.listColumns" :options="columnOptions" />
        <div class="field-tip">内容列表页显示哪几列</div>
      </a-form-item>
    </a-collapse-panel>
  </a-collapse>
</template>

<script setup lang="ts">
// 栏目管理的开发向配置：与运营字段分开，新建栏目时默认展开（必须填标识），编辑时默认收起
import { ref } from 'vue'
import { FIELD_DEFS, COLUMN_LABELS, EXTRA_FIELD_OPTIONS, isExtraField } from '../fieldDefs'

/** 高级设置字段，父组件表单需含这些键 */
export interface AdvancedModel {
  id?: number
  key: string
  type: string
  icon: string
  formFields: string[]
  listColumns: string[]
}

const model = defineModel<AdvancedModel>({ required: true })

// 基础字段（content 顶层列）与扩展字段（content.extra）分组显示，两组共用同一个 formFields 数组
const fieldOptions = Object.keys(FIELD_DEFS)
  .filter(k => !isExtraField(k))
  .map(k => ({ label: FIELD_DEFS[k].label, value: k }))
const columnOptions = Object.keys(COLUMN_LABELS).map(k => ({ label: COLUMN_LABELS[k], value: k }))

// 父组件每次打开面板都会以新 key 重建本组件，故只需按挂载时是否新建决定初始展开
const active = ref<string[]>(model.value.id ? [] : ['adv'])
</script>

<style scoped>
.adv {
  margin: 0 0 8px;
}

.adv :deep(.ant-collapse-header) {
  padding-left: 0 !important;
  color: #595959;
}

.field-tip {
  margin-top: 4px;
  font-size: 12px;
  color: #8c8c8c;
}
</style>
