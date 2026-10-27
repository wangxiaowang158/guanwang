<template>
  <div class="file-upload">
    <a-input
      :value="modelValue"
      placeholder="附件地址，点击右侧「上传附件」"
      readonly
      class="path-input"
    />
    <a-button :loading="uploading" @click="fileRef?.click()">上传附件</a-button>
    <a-button v-if="modelValue" :href="modelValue" target="_blank" rel="noopener">打开</a-button>
    <a-button v-if="modelValue" danger @click="emit('update:modelValue', '')">清除</a-button>
    <input ref="fileRef" type="file" :accept="UPLOAD_DOC_ACCEPT" style="display: none" @change="onPick" />
    <div class="tip">
      <template v-if="fileName">已上传：{{ fileName }}。</template>
      支持 {{ UPLOAD_DOC_LABEL }}，不超过 {{ UPLOAD_DOC_MAX_MB }}MB；前台显示为下载按钮
    </div>
  </div>
</template>

<script setup lang="ts">
// 附件字段：上传 PDF / Office 文档（产品手册、白皮书、资质证书），写回站内访问地址
import { ref } from 'vue'
import { message } from 'ant-design-vue'
import { uploadDocument } from '@/api/upload'
import {
  UPLOAD_DOC_ACCEPT, UPLOAD_DOC_EXTS, UPLOAD_DOC_LABEL, UPLOAD_DOC_MAX_BYTES, UPLOAD_DOC_MAX_MB,
} from '@/config'

defineProps<{ modelValue?: string }>()
const emit = defineEmits<{ 'update:modelValue': [string] }>()

const fileRef = ref<HTMLInputElement>()
const uploading = ref(false)
/** 本次上传的原文件名，只作展示（落盘用随机名） */
const fileName = ref('')

const UPLOAD_FAILED = '附件上传失败，请稍后重试'

const onPick = async (e: Event) => {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  // 清空以便重复选同一文件
  input.value = ''
  if (!file) return
  const dot = file.name.lastIndexOf('.')
  const ext = dot >= 0 ? file.name.slice(dot).toLowerCase() : ''
  // accept 只约束选择框，仍须校验
  if (!(UPLOAD_DOC_EXTS as readonly string[]).includes(ext)) {
    message.error(`请上传 ${UPLOAD_DOC_LABEL} 文件`)
    return
  }
  if (file.size > UPLOAD_DOC_MAX_BYTES) {
    message.error(`附件大小不能超过 ${UPLOAD_DOC_MAX_MB}MB`)
    return
  }
  uploading.value = true
  try {
    const res = await uploadDocument(file)
    if (res.data.code !== 200 || !res.data.data?.url) {
      message.error(res.data.message || UPLOAD_FAILED)
      return
    }
    fileName.value = res.data.data.name || file.name
    emit('update:modelValue', res.data.data.url)
  } catch {
    message.error(UPLOAD_FAILED)
  } finally {
    uploading.value = false
  }
}
</script>

<style scoped>
.file-upload {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.path-input {
  flex: 1;
  min-width: 240px;
}

.tip {
  flex-basis: 100%;
  font-size: 12px;
  color: #8c8c8c;
}
</style>
