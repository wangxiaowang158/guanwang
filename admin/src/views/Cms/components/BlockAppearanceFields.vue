<template>
  <!-- 区块外观：底色 / 背景图、每行列数、标题对齐；全部留默认即沿用模板原样（白 / 浅色交替、形态自带列数） -->
  <a-divider style="margin: 4px 0 16px">区块外观</a-divider>
  <a-form-item label="区块底色">
    <a-radio-group v-model:value="model.blockTone" button-style="solid">
      <a-radio-button value="auto">自动交替</a-radio-button>
      <a-radio-button value="white">白色</a-radio-button>
      <a-radio-button value="surface">浅色</a-radio-button>
      <a-radio-button value="dark">深色</a-radio-button>
      <a-radio-button value="image">背景图</a-radio-button>
    </a-radio-group>
    <div class="field-tip">自动交替：与相邻区块白 / 浅色错开。深色与背景图上文字自动反白，背景图会叠一层深色遮罩保证可读</div>
  </a-form-item>
  <a-form-item v-if="model.blockTone === 'image'" label="背景图" required>
    <ImageUpload v-model="model.blockBg" ai-scene="banner" tip="建议 1920×800 以上，画面暗一些文字更清楚" />
  </a-form-item>
  <a-form-item v-if="columnsApply" label="每行列数">
    <a-radio-group v-model:value="model.blockColumns">
      <a-radio :value="0">默认</a-radio>
      <a-radio :value="2">2 列</a-radio>
      <a-radio :value="3">3 列</a-radio>
      <a-radio :value="4">4 列</a-radio>
    </a-radio-group>
    <div class="field-tip">电脑端每行几张；平板自动减为 2 列，手机 1 列</div>
  </a-form-item>
  <a-form-item label="标题对齐">
    <a-radio-group v-model:value="model.headingAlign">
      <a-radio value="">默认</a-radio>
      <a-radio value="center">居中</a-radio>
      <a-radio value="left">左对齐</a-radio>
    </a-radio-group>
    <div class="field-tip">默认随网站模板：样式一居中，样式二左对齐</div>
  </a-form-item>
</template>

<script setup lang="ts">
// 嵌在栏目管理的区块配置下，字段直接写回父组件表单；保存时由父组件一并提交
import { computed } from 'vue'
import type { BlockLayout, BlockTone } from '@/api/cms'
import ImageUpload from './ImageUpload.vue'

/** 区块外观字段，父组件表单需含这些键 */
export interface AppearanceModel {
  layout?: BlockLayout
  blockTone: BlockTone
  blockBg: string
  blockColumns: number
  headingAlign: '' | 'center' | 'left'
}

const model = defineModel<AppearanceModel>({ required: true })

/** 前台读列数的展示形态：网格类；其余形态（列表、流程、看板等）有固定版式 */
const COLUMN_LAYOUTS: BlockLayout[] = ['cards', 'tiles', 'gallery', 'brand']
const columnsApply = computed(() => COLUMN_LAYOUTS.includes(model.value.layout ?? 'cards'))
</script>

<style scoped>
.field-tip {
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.6;
  color: #8c8c8c;
}
</style>
