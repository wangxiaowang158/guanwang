<template>
  <!-- 留言处理弹窗：详情、状态流转、回复线程与新增回复 -->
  <a-modal v-model:open="open" title="留言处理" :width="720" :footer="null">
    <a-spin :spinning="loading">
      <a-result v-if="loadError" status="warning" :title="loadError">
        <template #extra><a-button type="primary" @click="load(id!)">重新加载</a-button></template>
      </a-result>
      <template v-else-if="current">
        <a-descriptions :column="2" size="small" bordered>
          <a-descriptions-item label="来源">
            {{ FEEDBACK_SOURCE_LABEL[current.source] }}
            <span v-if="current.memberNickname">（{{ current.memberNickname }}）</span>
          </a-descriptions-item>
          <a-descriptions-item label="线索类型">
            {{ current.leadType ? FEEDBACK_LEAD_TYPE_LABEL[current.leadType] : '普通留言' }}
          </a-descriptions-item>
          <a-descriptions-item label="姓名">{{ current.name }}</a-descriptions-item>
          <a-descriptions-item label="联系电话">{{ current.phone || '-' }}</a-descriptions-item>
          <a-descriptions-item label="单位">{{ current.company || '-' }}</a-descriptions-item>
          <a-descriptions-item label="职位">{{ current.position || '-' }}</a-descriptions-item>
          <a-descriptions-item label="邮箱">{{ current.email || '-' }}</a-descriptions-item>
          <a-descriptions-item label="分类">{{ typeLabel(current.feedbackType) }}</a-descriptions-item>
          <a-descriptions-item label="状态">
            <a-tag :color="FEEDBACK_STATUS_COLOR[current.status]">{{ FEEDBACK_STATUS_LABEL[current.status] }}</a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="提交时间">{{ formatTime(current.createdAt) }}</a-descriptions-item>
          <a-descriptions-item label="提交 IP" :span="2">{{ current.submitIp || '-' }}</a-descriptions-item>
          <a-descriptions-item label="留言内容" :span="2">
            <div class="content-text">{{ current.content }}</div>
          </a-descriptions-item>
        </a-descriptions>

        <!-- 状态流转独立于回复：标记「处理中」或「关闭」无需填写回复内容 -->
        <div v-if="statusActions.length" class="status-bar">
          <span class="status-label">变更状态：</span>
          <a-space :size="8">
            <a-popconfirm
              v-for="target in statusActions"
              :key="target"
              :title="`确认将状态变更为「${FEEDBACK_STATUS_LABEL[target]}」？`"
              @confirm="onChangeStatus(target)"
            >
              <a-button size="small" :loading="statusUpdating">{{ FEEDBACK_STATUS_LABEL[target] }}</a-button>
            </a-popconfirm>
          </a-space>
        </div>

        <!-- 回复线程：按时间正序展示历史回复 -->
        <div class="reply-thread">
          <div class="section-title">回复记录</div>
          <a-empty v-if="!current.replies.length" description="暂无回复" :image-style="{ height: '48px' }" />
          <div v-for="item in current.replies" :key="item.id" class="reply-item">
            <div class="reply-meta">
              <span>{{ item.repliedBy || '管理员' }}</span>
              <span>{{ formatTime(item.createdAt) }}</span>
              <a-tag v-if="!item.visibleToMember" color="orange">仅内部</a-tag>
            </div>
            <div class="content-text">{{ item.content }}</div>
          </div>
        </div>

        <!-- 回复表单：closed 为终态，不再允许回复 -->
        <div v-if="current.status !== 'closed'" class="reply-form">
          <div class="section-title">新增回复</div>
          <a-textarea v-model:value="replyContent" :rows="4" :maxlength="1000" show-count placeholder="填写回复内容" />
          <div class="form-foot">
            <a-checkbox v-model:checked="visibleToMember">回复对会员可见</a-checkbox>
            <a-button type="primary" :loading="submitting" @click="onReply">提交回复</a-button>
          </div>
          <div class="foot-hint">
            {{ current.source === 'member' ? '提交回复后状态自动变为「已回复」' : '匿名留言无法收到站内回复，回复仅作内部留痕；请按联系电话联系对方' }}
          </div>
        </div>
        <div v-else class="reply-form">
          <div class="section-title">该留言已关闭，不可继续回复</div>
        </div>
      </template>
    </a-spin>
  </a-modal>
</template>

<script setup lang="ts">
// 留言处理弹窗：由父级控制开关与 id，状态或回复变化后 emit changed 让列表刷新
import { computed, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import {
  getFeedbackDetail, replyFeedback, updateFeedbackStatus,
  FEEDBACK_SOURCE_LABEL, FEEDBACK_TYPE_LABEL, FEEDBACK_STATUS_LABEL, FEEDBACK_LEAD_TYPE_LABEL,
  FEEDBACK_STATUS_COLOR, FEEDBACK_STATUS_FLOW,
  type FeedbackDetail, type FeedbackStatus, type FeedbackType,
} from '@/api/feedback'
import { SAVE_SUCCESS, SAVE_FAILED } from '@/constants/ui'

const props = defineProps<{ id: number | null }>()
const open = defineModel<boolean>('open', { required: true })
const emit = defineEmits<{ changed: [] }>()

/** 时间展示：空值补占位 */
const formatTime = (value: string | null) =>
  value ? new Date(value).toLocaleString('zh-CN', { hour12: false }) : '-'
/** 分类展示：早期访客咨询未填分类 */
const typeLabel = (value: FeedbackType | null) => (value ? FEEDBACK_TYPE_LABEL[value] : '-')

const current = ref<FeedbackDetail | null>(null)
const loading = ref(false)
const loadError = ref('')
const replyContent = ref('')
const visibleToMember = ref(true)
const submitting = ref(false)
const statusUpdating = ref(false)

/**
 * 拉取详情；单独抽出以便变更状态后刷新详情时不动回复草稿
 * @returns 取到的详情，失败为 null
 */
const load = async (id: number): Promise<FeedbackDetail | null> => {
  loading.value = true
  loadError.value = ''
  try {
    const res = await getFeedbackDetail(id)
    // 请求在途时已切到别的留言（关掉 A 立刻开 B）：丢弃过期结果，否则回复会落到 A 上
    if (props.id !== id) return null
    if (res.data.code !== 200 || !res.data.data) {
      loadError.value = res.data.message || '获取留言详情失败'
      return null
    }
    current.value = res.data.data
    return res.data.data
  } catch {
    loadError.value = '获取留言详情失败，请检查网络后重试'
    return null
  } finally {
    loading.value = false
  }
}

// 每次打开（或换了 id）重新取详情并重置回复表单
watch(
  () => [open.value, props.id] as const,
  async ([isOpen, id]) => {
    if (!isOpen || !id) return
    current.value = null
    replyContent.value = ''
    const detail = await load(id)
    // 默认可见性按来源（SRS 3.5.10）：会员反馈默认对会员可见；匿名咨询没有会员可看，默认仅内部留痕
    if (detail) visibleToMember.value = detail.source === 'member'
  },
  { immediate: true },
)

/**
 * 可直接流转到的目标状态：取自后端白名单，但排除 replied ——
 * 「已回复」只能由提交回复产生
 */
const statusActions = computed<FeedbackStatus[]>(() =>
  current.value ? FEEDBACK_STATUS_FLOW[current.value.status].filter(s => s !== 'replied') : [],
)

/** 单独变更状态，不附带回复 */
const onChangeStatus = async (target: FeedbackStatus) => {
  if (!current.value) return
  const id = current.value.id
  statusUpdating.value = true
  try {
    const res = await updateFeedbackStatus(id, target)
    if (res.data.code !== 200) {
      message.error(res.data.message || SAVE_FAILED)
      return
    }
    message.success(SAVE_SUCCESS)
    emit('changed')
    // 关闭后不再有可执行操作，直接收起；否则只刷新详情，保留回复草稿
    if (target === 'closed') open.value = false
    else await load(id)
  } catch {
    message.error(SAVE_FAILED)
  } finally {
    statusUpdating.value = false
  }
}

/** 提交回复；后端在回复成功后自动把状态推进为「已回复」 */
const onReply = async () => {
  if (!current.value) return
  const content = replyContent.value.trim()
  if (!content) {
    message.warning('请填写回复内容')
    return
  }
  submitting.value = true
  try {
    // 回复人由服务端按登录身份记录，前端不传，免得被改包冒名
    const res = await replyFeedback(current.value.id, { content, visibleToMember: visibleToMember.value })
    if (res.data.code !== 200) {
      message.error(res.data.message || SAVE_FAILED)
      return
    }
    message.success(SAVE_SUCCESS)
    open.value = false
    emit('changed')
  } catch {
    message.error(SAVE_FAILED)
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
/* 留言正文与回复正文均可能含换行，保留原始换行并允许长串折行 */
.content-text { white-space: pre-wrap; word-break: break-word; }
.reply-thread, .reply-form { margin-top: 20px; }
.status-bar { display: flex; align-items: center; gap: 8px; margin-top: 16px; }
.status-label { font-size: 13px; color: rgba(0, 0, 0, 0.65); }
.foot-hint { margin-top: 8px; font-size: 12px; color: rgba(0, 0, 0, 0.45); text-align: right; }
.section-title { margin-bottom: 10px; font-weight: 600; }
.reply-item { padding: 10px 12px; margin-bottom: 8px; background: var(--color-fill-alter, #fafafa); border-radius: 6px; }
.reply-meta { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; font-size: 12px; color: rgba(0, 0, 0, 0.45); }
/* 底部操作区：勾选项在左，提交按钮在右 */
.form-foot { display: flex; align-items: center; justify-content: space-between; margin-top: 12px; }
</style>
