<template>
  <PageContainer>
    <div class="content-edit">
      <div class="edit-head">
        <div class="title">{{ channel?.name || '编辑' }}</div>
        <a-button @click="goBack">返回</a-button>
      </div>
      <a-breadcrumb class="crumb">
        <a-breadcrumb-item v-for="n in crumbNames" :key="n">{{ n }}</a-breadcrumb-item>
      </a-breadcrumb>

      <div class="form-card">
        <ContentForm
          v-if="channel"
          :fields="channel.formFields"
          :model="model"
          :saving="saving"
          show-back
          @save="onSave"
          @back="goBack"
        />
      </div>
    </div>
  </PageContainer>
</template>

<script setup lang="ts">
// list 栏目的新增/编辑全页表单
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import PageContainer from '@/components/PageContainer/index.vue'
import { useChannels } from '@/composables/useChannels'
import { getContentDetail, saveContent, type Channel, type Content } from '@/api/cms'
import { sanitizeHtml } from '@/utils/sanitize'
import ContentForm from './ContentForm.vue'

const route = useRoute()
const router = useRouter()
const { load, findByKey, ancestors } = useChannels()

const channelKey = route.params.channelKey as string
const contentId = route.params.id ? Number(route.params.id) : undefined

const channel = ref<Channel | null>(null)
const model = ref<Record<string, any>>({})
const saving = ref(false)

const crumbNames = computed(() => channel.value ? ancestors(channel.value.key).map(c => c.name) : [])

const goBack = () => router.push(`/cms/${channelKey}`)

onMounted(async () => {
  await load()
  channel.value = findByKey(channelKey) || null
  // 初始化表单默认值
  const base: Record<string, any> = { channelKey, author: '管理员', source: '本站', isTop: false }
  if (contentId) {
    const res = await getContentDetail({ channelKey, id: contentId })
    if (res.data.code === 200 && res.data.data) {
      Object.assign(base, res.data.data)
    }
  }
  model.value = base
})

const onSave = async () => {
  saving.value = true
  try {
    // 富文本内容保存前净化，防存储型 XSS
    const payload: Partial<Content> & { channelKey: string } = { ...model.value, channelKey }
    if (payload.content) payload.content = sanitizeHtml(payload.content)
    const res = await saveContent(payload)
    if (res.data.code === 200) {
      message.success('保存成功')
      goBack()
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
.content-edit {
  background: transparent;
}

.edit-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title {
  font-size: 18px;
  font-weight: 600;
  color: #262626;
}

.crumb {
  margin: 8px 0 16px;
}

.form-card {
  background: #fff;
  border-radius: 8px;
  padding: 28px 24px;
}
</style>
