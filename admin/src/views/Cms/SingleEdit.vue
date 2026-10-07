<template>
  <div class="single-edit">
    <div class="page-title">{{ channel.name }}</div>
    <div class="form-card">
      <a-spin :spinning="loadState === 'loading'">
        <ContentForm
          :fields="channel.formFields"
          :channel-key="channel.key"
          v-model:model="model"
          :saving="saving"
          @save="onSave"
        />
      </a-spin>
    </div>
  </div>
</template>

<script setup lang="ts">
// single 栏目：单条富文本内容，进入即载入、就地保存
import { ref, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { getContentDetail, saveContent, type Channel, type Content, type ContentFormModel } from '@/api/cms'
import { sanitizeHtml } from '@/utils/sanitize'
import ContentForm from './ContentForm.vue'

const props = defineProps<{ channel: Channel }>()

const model = ref<ContentFormModel>({
  channelKey: props.channel.key, author: '管理员', source: '本站', isTop: false,
  // 新增默认已发布，需要暂存时手动改草稿
  status: 'published'
})
const saving = ref(false)
const recordId = ref<number>()
/**
 * 详情加载状态：未确认「已有哪条记录」之前不许保存。
 * 否则详情还没回来或加载失败时 recordId 为空，保存会走新建，单页栏目出现第二条、前台重复渲染
 */
const loadState = ref<'loading' | 'ready' | 'failed'>('loading')

onMounted(async () => {
  // single 栏目只有一条内容：detail 不传 id 时后端直接返回该栏目首条（无则新建）
  // 不走列表接口，免得为取一条记录拉一整页
  try {
    const detail = await getContentDetail({ channelKey: props.channel.key })
    if (detail.data.code !== 200) {
      loadState.value = 'failed'
      message.error(detail.data.message || '内容加载失败，请刷新重试')
      return
    }
    // data 为空表示该栏目尚无内容，属正常情况，保存即新建
    if (detail.data.data) {
      recordId.value = detail.data.data.id
      Object.assign(model.value, detail.data.data)
    }
    loadState.value = 'ready'
  } catch {
    loadState.value = 'failed'
    message.error('内容加载失败，请刷新重试')
  }
})

const onSave = async () => {
  if (loadState.value !== 'ready') {
    message.warning(loadState.value === 'loading' ? '内容加载中，请稍候' : '内容加载失败，请刷新页面后再保存')
    return
  }
  saving.value = true
  try {
    const payload: Partial<Content> & { channelKey: string } = { ...model.value, channelKey: props.channel.key }
    if (payload.content) payload.content = sanitizeHtml(payload.content)
    if (recordId.value) payload.id = recordId.value
    const res = await saveContent(payload)
    if (res.data.code === 200) {
      // 回填新建记录的 id：否则同一会话再点保存会再新增一条，前台按区块渲染全部行会出现重复
      if (res.data.data?.id) recordId.value = res.data.data.id
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
