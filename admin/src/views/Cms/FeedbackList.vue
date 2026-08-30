<template>
  <div class="feedback-list">
    <div class="page-title">意见反馈</div>

    <div class="toolbar">
      <a-space :size="12" wrap>
        <a-range-picker
          v-model:value="dateRange"
          value-format="YYYY-MM-DD"
          :placeholder="['提交开始日期', '提交结束日期']"
          @change="search"
        />
        <a-select
          v-model:value="source"
          placeholder="全部来源"
          style="width: 130px"
          allow-clear
          :options="sourceOptions"
          @change="search"
        />
        <a-select
          v-model:value="feedbackType"
          placeholder="全部分类"
          style="width: 130px"
          allow-clear
          :options="typeOptions"
          @change="search"
        />
        <a-select
          v-model:value="status"
          placeholder="全部状态"
          style="width: 130px"
          allow-clear
          :options="statusOptions"
          @change="search"
        />
        <a-input-search
          v-model:value="keyword"
          placeholder="姓名 / 单位 / 内容"
          style="width: 220px"
          allow-clear
          @search="search"
        />
      </a-space>
    </div>
    <div v-if="selectedKeys.length" class="batch-bar">
      <span>已选 {{ selectedKeys.length }} 条</span>
      <a-popconfirm title="确认删除选中的反馈？" @confirm="onBatchDelete">
        <a-button type="link" danger size="small">批量删除</a-button>
      </a-popconfirm>
    </div>

    <a-table
      :columns="columns"
      :data-source="rows"
      :loading="loading"
      row-key="id"
      size="middle"
      :row-selection="{ selectedRowKeys: selectedKeys, onChange: onSelectChange }"
      :pagination="{
        current: page,
        pageSize,
        total,
        showSizeChanger: true,
        showTotal: (n: number) => `共 ${n} 条`,
      }"
      @change="onTableChange"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'source'">
          {{ FEEDBACK_SOURCE_LABEL[record.source as FeedbackSource] }}
        </template>
        <template v-else-if="column.key === 'feedbackType'">
          {{ typeLabel(record.feedbackType) }}
        </template>
        <template v-else-if="column.key === 'status'">
          <a-tag :color="FEEDBACK_STATUS_COLOR[record.status as FeedbackStatus]">
            {{ FEEDBACK_STATUS_LABEL[record.status as FeedbackStatus] }}
          </a-tag>
        </template>
        <template v-else-if="column.key === 'createdAt'">
          {{ formatTime(record.createdAt) }}
        </template>
        <template v-else-if="column.key === 'action'">
          <a-space :size="4">
            <a-button type="link" size="small" @click="openDetail(record.id)">处理</a-button>
            <a-popconfirm title="确认删除该反馈？" @confirm="onDelete(record.id)">
              <a-button type="link" size="small" danger>删除</a-button>
            </a-popconfirm>
          </a-space>
        </template>
      </template>
    </a-table>
    <a-modal v-model:open="detailOpen" title="反馈处理" :width="720" :footer="null">
      <a-descriptions v-if="current" :column="2" size="small" bordered>
        <a-descriptions-item label="来源">
          {{ FEEDBACK_SOURCE_LABEL[current.source] }}
          <span v-if="current.memberNickname">（{{ current.memberNickname }}）</span>
        </a-descriptions-item>
        <a-descriptions-item label="分类">
          {{ typeLabel(current.feedbackType) }}
        </a-descriptions-item>
        <a-descriptions-item label="姓名">{{ current.name }}</a-descriptions-item>
        <a-descriptions-item label="联系电话">{{ current.phone || '-' }}</a-descriptions-item>
        <a-descriptions-item label="单位">{{ current.company || '-' }}</a-descriptions-item>
        <a-descriptions-item label="状态">
          <a-tag :color="FEEDBACK_STATUS_COLOR[current.status]">
            {{ FEEDBACK_STATUS_LABEL[current.status] }}
          </a-tag>
        </a-descriptions-item>
        <a-descriptions-item label="提交时间">{{ formatTime(current.createdAt) }}</a-descriptions-item>
        <a-descriptions-item label="提交 IP">{{ current.submitIp || '-' }}</a-descriptions-item>
        <a-descriptions-item label="反馈内容" :span="2">
          <div class="content-text">{{ current.content }}</div>
        </a-descriptions-item>
      </a-descriptions>

      <!-- 状态流转独立于回复：标记「处理中」或「关闭」无需填写回复内容 -->
      <div v-if="current && statusActions.length" class="status-bar">
        <span class="status-label">变更状态：</span>
        <a-space :size="8">
          <a-popconfirm
            v-for="target in statusActions"
            :key="target"
            :title="`确认将状态变更为「${FEEDBACK_STATUS_LABEL[target]}」？`"
            @confirm="onChangeStatus(target)"
          >
            <a-button size="small" :loading="statusUpdating">
              {{ FEEDBACK_STATUS_LABEL[target] }}
            </a-button>
          </a-popconfirm>
        </a-space>
      </div>

      <!-- 回复线程：按时间正序展示历史回复 -->
      <div v-if="current" class="reply-thread">
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
      <div v-if="current && current.status !== 'closed'" class="reply-form">
        <div class="section-title">新增回复</div>
        <a-textarea
          v-model:value="replyContent"
          :rows="4"
          :maxlength="1000"
          show-count
          placeholder="填写回复内容"
        />
        <div class="form-foot">
          <a-checkbox v-model:checked="visibleToMember">回复对会员可见</a-checkbox>
          <a-button type="primary" :loading="submitting" @click="onReply">提交回复</a-button>
        </div>
        <div class="foot-hint">提交回复后状态自动变为「已回复」</div>
      </div>

      <!-- 无需回复时仅提供状态流转 -->
      <div v-else-if="current" class="reply-form">
        <div class="section-title">该反馈已关闭，不可继续回复</div>
      </div>
    </a-modal>
  </div>
</template>
<script setup lang="ts">
// 意见反馈：访客咨询与会员反馈合并管理，含回复线程、状态流转、单条与批量删除
import { computed, ref } from 'vue'
import { message } from 'ant-design-vue'
import {
  getFeedbackList, getFeedbackDetail, replyFeedback, updateFeedbackStatus,
  deleteFeedback, batchDeleteFeedback,
  FEEDBACK_SOURCE_LABEL, FEEDBACK_TYPE_LABEL, FEEDBACK_STATUS_LABEL,
  FEEDBACK_STATUS_COLOR, FEEDBACK_STATUS_FLOW,
  type FeedbackDetail, type FeedbackListItem,
  type FeedbackSource, type FeedbackStatus, type FeedbackType,
} from '@/api/feedback'
import { useServerListPage } from '@/composables/useServerListPage'
import { useUserStore } from '@/store/modules/user'
import { DELETE_SUCCESS, DELETE_FAILED, SAVE_SUCCESS, SAVE_FAILED } from '@/constants/ui'

const userStore = useUserStore()

/** 时间展示：空值补占位，避免表格出现空白单元格 */
const formatTime = (value: string | null) =>
  value ? new Date(value).toLocaleString('zh-CN', { hour12: false }) : '-'

/** 分类展示：早期访客咨询未填分类，需容忍空值 */
const typeLabel = (value: FeedbackType | null) =>
  value ? FEEDBACK_TYPE_LABEL[value] : '-'

/** 把 Record 转成下拉选项 */
const toOptions = <T extends string>(labels: Record<T, string>) =>
  (Object.keys(labels) as T[]).map((value) => ({ value, label: labels[value] }))

const sourceOptions = toOptions(FEEDBACK_SOURCE_LABEL)
const typeOptions = toOptions(FEEDBACK_TYPE_LABEL)
const statusOptions = toOptions(FEEDBACK_STATUS_LABEL)
const columns = [
  { title: '来源', key: 'source', width: 100 },
  { title: '姓名', dataIndex: 'name', key: 'name', width: 110 },
  { title: '单位', dataIndex: 'company', key: 'company', width: 160, ellipsis: true },
  { title: '手机号', dataIndex: 'phoneMasked', key: 'phoneMasked', width: 130 },
  { title: '分类', key: 'feedbackType', width: 100 },
  { title: '内容', dataIndex: 'content', key: 'content', ellipsis: true },
  { title: '回复数', dataIndex: 'replyCount', key: 'replyCount', width: 80, align: 'center' as const },
  { title: '状态', key: 'status', width: 90 },
  { title: '提交时间', key: 'createdAt', width: 170 },
  { title: '操作', key: 'action', width: 130, align: 'center' as const },
]

// 本页独有筛选条件，由闭包传入取数函数
const keyword = ref('')
const source = ref<FeedbackSource>()
const feedbackType = ref<FeedbackType>()
const status = ref<FeedbackStatus>()
const dateRange = ref<[string, string]>()

const detailOpen = ref(false)
const current = ref<FeedbackDetail | null>(null)
const replyContent = ref('')
const visibleToMember = ref(true)
const submitting = ref(false)
const statusUpdating = ref(false)

const {
  loading, rows, selectedKeys, page, pageSize, total,
  fetchList, search, onPageChange, onSelectChange, refreshAfterRemove,
} = useServerListPage<FeedbackListItem>((query) =>
  getFeedbackList({
    keyword: keyword.value || undefined,
    source: source.value,
    feedbackType: feedbackType.value,
    status: status.value,
    startDate: dateRange.value?.[0],
    endDate: dateRange.value?.[1],
    page: query.page,
    pageSize: query.pageSize,
  }),
)

/** 表格分页变更 */
const onTableChange = (pag: { current?: number; pageSize?: number }) =>
  onPageChange(pag.current || 1, pag.pageSize || pageSize.value)
/**
 * 可直接流转到的目标状态
 * 取自后端白名单，但排除 replied —— 「已回复」只能由提交回复产生，
 * 不允许在没有回复内容的情况下手动标记为已回复
 */
const statusActions = computed<FeedbackStatus[]>(() => {
  if (!current.value) return []
  return FEEDBACK_STATUS_FLOW[current.value.status].filter((s) => s !== 'replied')
})

/** 单独变更状态，不附带回复；成功后刷新详情与列表 */
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
    // 关闭后不再有可执行操作，直接收起弹窗
    if (target === 'closed') {
      detailOpen.value = false
    } else {
      // 只刷新详情数据，保留管理员可能已输入的回复草稿
      await loadDetail(id)
    }
    await fetchList()
  } catch {
    message.error(SAVE_FAILED)
  } finally {
    statusUpdating.value = false
  }
}

/**
 * 拉取详情写入 current
 * 单独抽出以便变更状态后刷新详情时不动回复表单，避免清空未提交的草稿
 * @returns 是否取到详情
 */
const loadDetail = async (id: number): Promise<boolean> => {
  const res = await getFeedbackDetail(id)
  if (res.data.code !== 200 || !res.data.data) {
    message.error(res.data.message || '获取反馈详情失败')
    return false
  }
  current.value = res.data.data
  return true
}

/** 打开处理弹窗：列表只有遮蔽手机号且不含回复线程，需另取详情 */
const openDetail = async (id: number) => {
  if (!(await loadDetail(id))) return
  replyContent.value = ''
  visibleToMember.value = true
  detailOpen.value = true
}

/** 提交回复；后端会在回复成功后自动把状态推进为「已回复」 */
const onReply = async () => {
  if (!current.value) return
  const content = replyContent.value.trim()
  if (!content) {
    message.warning('请填写回复内容')
    return
  }
  submitting.value = true
  try {
    // 回复人取当前登录管理员，供回复记录追溯
    const res = await replyFeedback(current.value.id, {
      content,
      repliedBy: userStore.state.value.username || undefined,
      visibleToMember: visibleToMember.value,
    })
    if (res.data.code !== 200) {
      message.error(res.data.message || SAVE_FAILED)
      return
    }
    // 后端在回复成功后自动把状态推进为「已回复」，此处无需再调状态接口
    message.success(SAVE_SUCCESS)
    detailOpen.value = false
    await fetchList()
  } catch {
    message.error(SAVE_FAILED)
  } finally {
    submitting.value = false
  }
}
/** 删除单条反馈（连带其回复记录） */
const onDelete = async (id: number) => {
  const res = await deleteFeedback(id)
  if (res.data.code !== 200) {
    message.error(res.data.message || DELETE_FAILED)
    return
  }
  message.success(DELETE_SUCCESS)
  await refreshAfterRemove(1)
}

/** 批量删除选中反馈 */
const onBatchDelete = async () => {
  const ids = [...selectedKeys.value]
  if (!ids.length) return
  const res = await batchDeleteFeedback(ids)
  if (res.data.code !== 200) {
    message.error(res.data.message || DELETE_FAILED)
    return
  }
  message.success(DELETE_SUCCESS)
  // 用后端返回的实际删除数，并发场景下可能少于请求条数
  await refreshAfterRemove(res.data.data?.removed ?? ids.length)
}
</script>
<style scoped>
.page-title {
  margin-bottom: 16px;
  font-size: 18px;
  font-weight: 600;
}

.toolbar {
  margin-bottom: 16px;
}

.batch-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  padding: 8px 12px;
  background: var(--color-fill-alter, #fafafa);
  border-radius: 6px;
  font-size: 13px;
}

/* 反馈正文与回复正文均可能含换行，保留原始换行并允许长串折行 */
.content-text {
  white-space: pre-wrap;
  word-break: break-word;
}

.reply-thread,
.reply-form {
  margin-top: 20px;
}

.status-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
}

.status-label {
  font-size: 13px;
  color: rgba(0, 0, 0, 0.65);
}

.foot-hint {
  margin-top: 8px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  text-align: right;
}

.section-title {
  margin-bottom: 10px;
  font-weight: 600;
}

.reply-item {
  padding: 10px 12px;
  margin-bottom: 8px;
  background: var(--color-fill-alter, #fafafa);
  border-radius: 6px;
}

.reply-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}

/* 底部操作区右对齐，与其他编辑页保持一致 */
.form-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12px;
}
</style>
