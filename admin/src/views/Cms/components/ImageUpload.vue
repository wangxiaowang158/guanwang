<template>
  <div class="image-upload">
    <a-input
      :value="modelValue"
      placeholder="图片地址，或点击右侧上传"
      readonly
      class="path-input"
    >
      <template #addonAfter>
        <span class="upload-btn" @click="triggerPick">上传图片</span>
      </template>
    </a-input>
    <a-button class="preview-btn" :disabled="!modelValue" @click="previewVisible = true">
      预览图片
    </a-button>
    <span v-if="tip" class="tip">{{ tip }}</span>

    <!-- 隐藏的文件选择 -->
    <input
      ref="fileRef"
      type="file"
      :accept="UPLOAD_ACCEPT"
      style="display: none"
      @change="onFileChange"
    />

    <!-- 预览弹窗 -->
    <a-modal v-model:open="previewVisible" title="图片预览" :footer="null" width="640px">
      <img v-if="modelValue" :src="modelValue" alt="预览" class="preview-img" />
    </a-modal>
  </div>
</template>

<script setup lang="ts">
// 图片上传：mock 阶段选本地图片转 base64 预览（无真实后端）
import { ref } from 'vue'
import { message } from 'ant-design-vue'
import {
  UPLOAD_ACCEPT, UPLOAD_MAX_MB, UPLOAD_MAX_BYTES,
  UPLOAD_IMAGE_MIMES, UPLOAD_IMAGE_LABEL
} from '@/config'

const props = defineProps<{ modelValue?: string; tip?: string }>()
const emit = defineEmits<{ 'update:modelValue': [string] }>()

const fileRef = ref<HTMLInputElement>()
const previewVisible = ref(false)

const triggerPick = () => fileRef.value?.click()

// 选图后校验类型与大小，转 base64 写回；限制取自 config，与富文本编辑器一致
const onFileChange = (e: Event) => {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  if (!(UPLOAD_IMAGE_MIMES as readonly string[]).includes(file.type)) {
    message.error(`请上传 ${UPLOAD_IMAGE_LABEL} 格式图片`)
    input.value = ''
    return
  }
  if (file.size > UPLOAD_MAX_BYTES) {
    message.error(`图片大小不能超过 ${UPLOAD_MAX_MB}MB`)
    input.value = ''
    return
  }
  const reader = new FileReader()
  reader.onload = () => {
    emit('update:modelValue', String(reader.result))
  }
  reader.readAsDataURL(file)
  input.value = ''
}
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

.upload-btn {
  cursor: pointer;
  user-select: none;
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
