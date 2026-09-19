<template>
  <div class="video-upload">
    <div class="upload-row">
      <a-input
        :value="modelValue"
        placeholder="视频地址，或点击右侧上传"
        readonly
        class="path-input"
      >
        <template #addonAfter>
          <span class="upload-btn" @click="triggerPick">
            {{ uploading ? '上传中…' : '上传视频' }}
          </span>
        </template>
      </a-input>
      <a-button class="preview-btn" :disabled="!modelValue" @click="previewVisible = true">
        预览视频
      </a-button>
      <a-button v-if="modelValue" danger @click="onClear">清除</a-button>
      <span class="tip">{{ tip || defaultTip }}</span>
    </div>

    <!-- 上传进度：视频体积大，没有进度提示会让人以为卡住了 -->
    <a-progress v-if="uploading" :percent="progress" size="small" class="progress" />

    <!-- 隐藏的文件选择 -->
    <input
      ref="fileRef"
      type="file"
      :accept="UPLOAD_VIDEO_ACCEPT"
      style="display: none"
      @change="onFileChange"
    />

    <!-- 预览弹窗：destroy-on-close 让关闭时销毁 video 元素，停掉后台播放 -->
    <a-modal
      v-model:open="previewVisible"
      title="视频预览"
      :footer="null"
      width="720px"
      destroy-on-close
    >
      <video v-if="modelValue" :src="modelValue" controls preload="metadata" class="preview-video" />
    </a-modal>
  </div>
</template>

<script setup lang="ts">
// 视频上传：选本地视频上传到后端，写回站内访问地址
import { computed, ref } from 'vue'
import { UPLOAD_VIDEO_ACCEPT, UPLOAD_VIDEO_LABEL, UPLOAD_VIDEO_MAX_MB } from '@/config'
import { useVideoUpload } from '@/composables/useVideoUpload'

defineProps<{ modelValue?: string; tip?: string }>()
const emit = defineEmits<{ 'update:modelValue': [string] }>()

const fileRef = ref<HTMLInputElement>()
const previewVisible = ref(false)

const { uploading, progress, pickAndUpload } = useVideoUpload()

// 未指定提示时，把格式与体积限制直接写在控件旁，省得用户上传失败才知道
const defaultTip = computed(() => `支持 ${UPLOAD_VIDEO_LABEL}，不超过 ${UPLOAD_VIDEO_MAX_MB}MB`)

const triggerPick = () => {
  if (uploading.value) return
  fileRef.value?.click()
}

// 校验与上传由 composable 统一处理，此处只负责把地址写回表单
const onFileChange = async (e: Event) => {
  const url = await pickAndUpload(e.target as HTMLInputElement)
  if (url) emit('update:modelValue', url)
}

const onClear = () => emit('update:modelValue', '')
</script>

<style scoped>
.video-upload {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.upload-row {
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

.progress {
  /* 与输入框左边缘对齐，不跟着 flex 居中 */
  margin: 0;
}

.preview-video {
  width: 100%;
  display: block;
  max-height: 60vh;
  background: #000;
}
</style>
