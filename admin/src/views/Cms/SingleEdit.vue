<template>
  <div class="single-edit">
    <div class="single-head">
      <ChannelTitle :channel="channel" />
      <!-- 栏目不在官网页面上时，按钮点开会提示无可预览页面 -->
      <PreviewPageButton :channel-key="channel.key" />
    </div>
    <div class="form-card">
      <a-spin :spinning="loadState === 'loading'">
        <ContentForm
          :fields="channel.formFields"
          :channel-key="channel.key"
          v-model:model="model"
          v-model:extra="extraDraft"
          :saving="saving"
          @save="onSave"
        />
      </a-spin>
    </div>
  </div>
</template>

<script setup lang="ts">
// single 栏目：单条富文本内容，进入即载入、就地保存
import { ref, onMounted, nextTick } from 'vue'
import { message } from 'ant-design-vue'
import { useUnsavedGuard } from '@/composables/useUnsavedGuard'
import {
  getContentDetail, saveContent,
  type Channel, type Content, type ContentExtra, type ContentFormModel,
} from '@/api/cms'
import { sanitizeHtml } from '@/utils/sanitize'
import ChannelTitle from './components/ChannelTitle.vue'
import PreviewPageButton from './components/PreviewPageButton.vue'
import ContentForm from './ContentForm.vue'
import { draftToExtra, emptyDraft, extraToDraft } from './components/extra/extraDraft'
import { isExtraField } from './fieldDefs'

const props = defineProps<{ channel: Channel }>()

const model = ref<ContentFormModel>({
  channelKey: props.channel.key, author: '管理员', source: '本站', isTop: false,
  // 尚无内容时默认草稿，点「发布到官网」才上线
  status: 'draft'
})
// 扩展字段草稿（content.extra）；originalExtra 用于保存时保留未启用字段的旧值
const extraDraft = ref(emptyDraft())
const originalExtra = ref<ContentExtra | null>(null)
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
      const { extra, ...rest } = detail.data.data
      recordId.value = rest.id
      Object.assign(model.value, rest)
      originalExtra.value = extra ?? null
      extraDraft.value = extraToDraft(extra)
    }
    loadState.value = 'ready'
    // 等富文本回写初值后再记基准，否则一进来就算「有改动」
    await nextTick()
    markSaved()
  } catch {
    loadState.value = 'failed'
    message.error('内容加载失败，请刷新重试')
  }
})

// 离开拦截：载入完成前不拦
const { markSaved } = useUnsavedGuard(() =>
  loadState.value === 'ready' ? { model: model.value, extra: extraDraft.value } : null
)

const onSave = async (status: 'published' | 'draft') => {
  // 防连点：表单校验是异步的，新建时 recordId 还没回填，连点两次会建出两条
  if (saving.value) return
  if (loadState.value !== 'ready') {
    message.warning(loadState.value === 'loading' ? '内容加载中，请稍候' : '内容加载失败，请刷新页面后再保存')
    return
  }
  saving.value = true
  try {
    const payload: Partial<Content> & { channelKey: string } = { ...model.value, channelKey: props.channel.key, status }
    if (payload.content) payload.content = sanitizeHtml(payload.content)
    // 栏目没启用任何扩展字段时不带 extra：后端据此保持原值，不会误清
    const extraKeys = props.channel.formFields.filter(isExtraField)
    if (extraKeys.length) payload.extra = draftToExtra(extraDraft.value, extraKeys, originalExtra.value)
    if (recordId.value) payload.id = recordId.value
    const res = await saveContent(payload)
    if (res.data.code === 200) {
      // 回填新建记录的 id：否则同一会话再点保存会再新增一条，前台按区块渲染全部行会出现重复
      if (res.data.data?.id) recordId.value = res.data.data.id
      model.value.status = status
      markSaved()
      message.success(status === 'published'
        ? '已发布，刷新官网即可看到'
        : '已存为草稿，官网不显示；可点右上「预览页面」查看效果')
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

.form-card {
  padding-top: 8px;
}

.single-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}
</style>
