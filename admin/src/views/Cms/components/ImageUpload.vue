<template>
  <div class="image-upload">
    <a-input
      :value="modelValue"
      placeholder="图片地址，或点击右侧上传"
      readonly
      class="path-input"
    >
      <template #addonAfter>
        <span class="upload-btn" @click="triggerPick">
          {{ uploading ? '上传中…' : '上传图片' }}
        </span>
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
// 图片上传：选本地图片上传到后端，写回站内访问地址
import { ref } from 'vue'
import { UPLOAD_ACCEPT } from '@/config'
import { useImageUpload } from '@/composables/useImageUpload'

defineProps<{ modelValue?: string; tip?: string }>()
const emit = defineEmits<{ 'update:modelValue': [string] }>()

const fileRef = ref<HTMLInputElement>()
const previewVisible = ref(false)

const { uploading, pickAndUpload } = useImageUpload()

const triggerPick = () => {
  if (uploading.value) return
  fileRef.value?.click()
}

// 校验与上传由 composable 统一处理，此处只负责把地址写回表单
const onFileChange = async (e: Event) => {
  const url = await pickAndUpload(e.target as HTMLInputElement)
  if (url) emit('update:modelValue', url)
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
  /* 上传中文案更长，固定宽度避免输入框宽度跳动 */
  display: inline-block;
  min-width: 56px;
  text-align: center;
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
