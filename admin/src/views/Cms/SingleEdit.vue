<template>
  <div class="single-edit">
    <div class="page-title">{{ channel.name }}</div>
    <div class="form-card">
      <ContentForm
        :fields="channel.formFields"
        :model="model"
        :saving="saving"
        @save="onSave"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
// single 栏目：单条富文本内容，进入即载入、就地保存
import { ref, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { getContentList, getContentDetail, saveContent, type Channel, type Content } from '@/api/cms'
import { sanitizeHtml } from '@/utils/sanitize'
import ContentForm from './ContentForm.vue'

const props = defineProps<{ channel: Channel }>()

const model = ref<Record<string, any>>({ channelKey: props.channel.key, author: '管理员', source: '本站', isTop: false })
const saving = ref(false)
const recordId = ref<number>()

onMounted(async () => {
  // single 栏目取该栏目下的第一条记录（无则新建）
  const res = await getContentList({ channelKey: props.channel.key })
  if (res.data.code === 200 && res.data.data.length) {
    recordId.value = res.data.data[0].id
    const detail = await getContentDetail({ channelKey: props.channel.key, id: recordId.value })
    if (detail.data.code === 200 && detail.data.data) {
      Object.assign(model.value, detail.data.data)
    }
  }
})

const onSave = async () => {
  saving.value = true
  try {
    const payload: Partial<Content> & { channelKey: string } = { ...model.value, channelKey: props.channel.key }
    if (payload.content) payload.content = sanitizeHtml(payload.content)
    if (recordId.value) payload.id = recordId.value
    const res = await saveContent(payload)
    if (res.data.code === 200) {
      message.success('保存成功')
    } else {
      message.error(res.data.message || '保存失败，请稍后重试')
    }
  } catch {
    message.error('保存失败，请稍后重试')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.single-edit {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
}

.page-title {
  font-size: 18px;
  font-weight: 600;
  color: #262626;
  margin-bottom: 16px;
}

.form-card {
  padding-top: 8px;
}
</style>
