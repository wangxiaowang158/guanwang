<template>
  <div class="image-upload">
    <a-input
      :value="modelValue"
      placeholder="图片地址，点击右侧「选择图片」"
      readonly
      class="path-input"
    />
    <!-- 素材库 / 本地上传 / AI 生成 三合一入口 -->
    <a-button class="preview-btn" @click="pickerOpen = true">选择图片</a-button>
    <a-button class="preview-btn" :disabled="!modelValue" @click="previewVisible = true">
      预览图片
    </a-button>
    <!-- 输入框只读，不提供清除就没法撤掉已选图片 -->
    <a-button v-if="modelValue" class="preview-btn" danger @click="emit('update:modelValue', '')">
      清除
    </a-button>
    <span v-if="tip" class="tip">{{ tip }}</span>

    <!-- 预览弹窗 -->
    <a-modal v-model:open="previewVisible" title="图片预览" :footer="null" width="640px">
      <img v-if="modelValue" :src="modelValue" alt="预览" class="preview-img" />
    </a-modal>

    <CoverPickerModal
      v-model:open="pickerOpen"
      title="选择图片"
      :ai-scene="aiScene"
      :no-ai="noAi"
      :raw="raw"
      @confirm="(url) => emit('update:modelValue', url)"
    />
  </div>
</template>

<script setup lang="ts">
// 图片字段：地址输入框 + 选择图片（素材库 / 本地上传 / AI 生成）+ 预览，写回站内访问地址
import { ref } from 'vue'
import type { AiImageScene } from '@/api/upload'
import CoverPickerModal from './CoverPickerModal.vue'

// aiScene：AI 生成时的用途，决定出图比例；缺省按内容封面
// noAi：二维码这类必须是原图的位置，不提供 AI 生成
// raw：品牌素材（Logo、图标、二维码、分享图），本地上传不加水印、不转 WebP
withDefaults(
  defineProps<{ modelValue?: string; tip?: string; aiScene?: AiImageScene; noAi?: boolean; raw?: boolean }>(),
  { aiScene: 'cover' }
)
const emit = defineEmits<{ 'update:modelValue': [string] }>()

const previewVisible = ref(false)
const pickerOpen = ref(false)
</script>

<style scoped>
.image-upload {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.path-input {
  flex: 1;
  min-width: 280px;
}

.tip {
  color: #8c8c8c;
  font-size: 12px;
}

.preview-img {
  width: 100%;
  display: block;
}
</style>
