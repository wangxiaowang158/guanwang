<template>
  <!-- 素材库直接上传：图片可多选，视频单个（大文件带进度与取消）；成功后 emit uploaded 让列表刷新 -->
  <a-space :size="8">
    <a-button type="primary" :loading="imageBusy" :disabled="videoUploading" @click="imageInput?.click()">
      <template #icon><UploadOutlined /></template>
      上传图片
    </a-button>
    <a-button :disabled="imageBusy || videoUploading" @click="videoInput?.click()">上传视频</a-button>
    <span v-if="videoUploading" class="progress">
      {{ videoProcessing ? '处理中…' : `视频上传 ${videoProgress}%` }}
      <a-button v-if="!videoProcessing" type="link" size="small" @click="cancelVideo">取消</a-button>
    </span>
    <input ref="imageInput" type="file" :accept="UPLOAD_ACCEPT" multiple hidden @change="onPickImages" />
    <input ref="videoInput" type="file" :accept="UPLOAD_VIDEO_ACCEPT" hidden @change="onPickVideo" />
  </a-space>
</template>

<script setup lang="ts">
// 素材库上传入口：复用内容编辑里同一套上传接口与前端校验，口径一致
import { ref } from 'vue'
import { message } from 'ant-design-vue'
import { UploadOutlined } from '@ant-design/icons-vue'
import { uploadImage } from '@/api/upload'
import {
  UPLOAD_ACCEPT, UPLOAD_IMAGE_LABEL, UPLOAD_IMAGE_MIMES, UPLOAD_MAX_BYTES, UPLOAD_MAX_MB,
  UPLOAD_VIDEO_ACCEPT,
} from '@/config'
import { useVideoUpload } from '@/composables/useVideoUpload'

const emit = defineEmits<{ uploaded: [] }>()

const imageInput = ref<HTMLInputElement>()
const videoInput = ref<HTMLInputElement>()
const imageBusy = ref(false)

const {
  uploading: videoUploading, progress: videoProgress, processing: videoProcessing,
  pickAndUpload, cancel: cancelVideo,
} = useVideoUpload()

/** 一次最多传几张：防止误选整个相册把接口打满 */
const MAX_BATCH = 20

/** 逐张上传选中的图片，汇总结果一次提示 */
const onPickImages = async (e: Event) => {
  const input = e.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  input.value = ''
  if (!files.length) return
  if (files.length > MAX_BATCH) {
    message.warning(`一次最多上传 ${MAX_BATCH} 张，请分批选择`)
    return
  }
  // 类型与大小先在前端挡：accept 只约束选择框，用户仍可改筛选条件绕过
  const invalid = files.filter(f => !(UPLOAD_IMAGE_MIMES as readonly string[]).includes(f.type) || f.size > UPLOAD_MAX_BYTES)
  const valid = files.filter(f => !invalid.includes(f))
  if (invalid.length) message.warning(`${invalid.length} 个文件未上传：仅支持 ${UPLOAD_IMAGE_LABEL}，单张不超过 ${UPLOAD_MAX_MB}MB`)
  if (!valid.length) return

  imageBusy.value = true
  let ok = 0
  let failed = 0
  try {
    // 串行上传：并发会触发上传接口的频率限制，且失败时不好对应是哪张
    for (const file of valid) {
      try {
        const res = await uploadImage(file)
        if (res.data.code === 200 && res.data.data?.url) ok += 1
        else failed += 1
      } catch {
        failed += 1
      }
    }
  } finally {
    imageBusy.value = false
  }
  if (ok) {
    message.success(failed ? `已上传 ${ok} 张，${failed} 张失败` : `已上传 ${ok} 张`)
    emit('uploaded')
  } else {
    message.error('上传失败，请稍后重试')
  }
}

/** 视频走与编辑页同一套逻辑：前端校验、进度、取消、超限提示 */
const onPickVideo = async (e: Event) => {
  const url = await pickAndUpload(e.target as HTMLInputElement)
  if (url) {
    message.success('视频已上传')
    emit('uploaded')
  }
}
</script>

<style scoped>
.progress {
  font-size: 13px;
  color: #595959;
}
</style>
