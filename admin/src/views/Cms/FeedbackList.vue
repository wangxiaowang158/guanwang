<template>
  <div class="feedback-list">
    <!-- 标题跟随栏目名（与侧边栏一致），可在栏目管理里改名，如改成「留言与线索」 -->
    <div class="page-title">{{ channel?.name || '留言与线索' }}</div>

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
          v-model:value="leadType"
          placeholder="全部线索类型"
          style="width: 150px"
          allow-clear
          :options="leadTypeOptions"
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
        <a-input
          v-model:value="keyword"
          placeholder="姓名 / 单位 / 内容"
          style="width: 220px"
          allow-clear
          :maxlength="50"
          @press-enter="search"
        />
        <SearchActions :loading="loading" @search="search" @reset="onResetFilters" />
      </a-space>
    </div>
    <!-- 功能操作行：导出放这里，不与查询条件挤在同一行 -->
    <div class="actions">
      <span class="actions-title">留言数据</span>
      <a-space>
        <a-button @click="notifyOpen = true">
          <template #icon><BellOutlined /></template>
          推送到群
        </a-button>
        <a-button :loading="exporting" @click="onExport">
          <template #icon><DownloadOutlined /></template>
          导出
        </a-button>
      </a-space>
    </div>
    <div v-if="selectedKeys.length" class="batch-bar">
      <span>已选 {{ selectedKeys.length }} 条</span>
      <a-popconfirm :title="`确定删除选中的 ${selectedKeys.length} 条留言吗？回复记录一并删除，不可恢复`" ok-type="danger" @confirm="onBatchDelete">
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
        <template v-else-if="column.key === 'leadType'">
          <a-tag v-if="record.leadType" color="blue">{{ FEEDBACK_LEAD_TYPE_LABEL[record.leadType as FeedbackLeadType] }}</a-tag>
          <span v-else class="muted">普通留言</span>
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
            <a-popconfirm title="确定删除这条留言吗？回复记录一并删除，不可恢复" ok-type="danger" @confirm="onDelete(record.id)">
              <a-button type="link" size="small" danger>删除</a-button>
            </a-popconfirm>
          </a-space>
        </template>
      </template>
    </a-table>
    <FeedbackDetailModal v-model:open="detailOpen" :id="detailId" @changed="onChanged" />
    <NotifyConfigModal v-model:open="notifyOpen" />
  </div>
</template>
<script setup lang="ts">
// 留言与线索：访客咨询、预约线索与会员反馈合并管理；处理弹窗见 FeedbackDetailModal
import { ref } from 'vue'
import SearchActions from '@/components/SearchActions/index.vue'
import { message } from 'ant-design-vue'
import { BellOutlined, DownloadOutlined } from '@ant-design/icons-vue'
import {
  getFeedbackList, deleteFeedback, batchDeleteFeedback, exportFeedback,
  FEEDBACK_SOURCE_LABEL, FEEDBACK_TYPE_LABEL, FEEDBACK_STATUS_LABEL, FEEDBACK_LEAD_TYPE_LABEL,
  FEEDBACK_STATUS_COLOR, LEAD_TYPE_NONE,
  type FeedbackLeadType, type FeedbackListItem,
  type FeedbackSource, type FeedbackStatus, type FeedbackType,
} from '@/api/feedback'
import { useRoute } from 'vue-router'
import { useServerListPage } from '@/composables/useServerListPage'
import { readBlobError, parseFileName, saveBlob } from '@/utils/download'
import { DELETE_SUCCESS, DELETE_FAILED, EXPORT_FAILED } from '@/constants/ui'
import FeedbackDetailModal from './components/feedback/FeedbackDetailModal.vue'
import NotifyConfigModal from './components/feedback/NotifyConfigModal.vue'
import { usePendingFeedback } from '@/composables/usePendingFeedback'
import type { Channel } from '@/api/cms'

defineProps<{ channel?: Channel }>()

const route = useRoute()
const { refresh: refreshPendingBadge } = usePendingFeedback()

/** 列表有变化（处理、删除）后刷新列表并同步侧边栏角标 */
const onChanged = async () => {
  await fetchList()
  void refreshPendingBadge(true)
}

/** 时间展示：空值补占位，避免表格出现空白单元格 */
const formatTime = (value: string | null) =>
  value ? new Date(value).toLocaleString('zh-CN', { hour12: false }) : '-'

/** 分类展示：早期访客咨询未填分类，需容忍空值 */
const typeLabel = (value: FeedbackType | null) =>
  value ? FEEDBACK_TYPE_LABEL[value] : '-'

/** 把 Record 转成下拉选项 */
const toOptions = <T extends string>(labels: Record<T, string>) =>
  (Object.keys(labels) as T[]).map((value) => ({ value, label: labels[value] }))

/** 解析路由带入的状态筛选，非法值忽略（query 来自 URL，属外部输入） */
function resolveInitialStatus(): FeedbackStatus | undefined {
  const raw = route.query.status
  if (typeof raw !== 'string') return undefined
  return raw in FEEDBACK_STATUS_LABEL ? (raw as FeedbackStatus) : undefined
}

const sourceOptions = toOptions(FEEDBACK_SOURCE_LABEL)
const leadTypeOptions = [...toOptions(FEEDBACK_LEAD_TYPE_LABEL), { value: LEAD_TYPE_NONE, label: '普通留言' }]
const typeOptions = toOptions(FEEDBACK_TYPE_LABEL)
const statusOptions = toOptions(FEEDBACK_STATUS_LABEL)
const columns = [
  { title: '来源', key: 'source', width: 100 },
  { title: '姓名', dataIndex: 'name', key: 'name', width: 110 },
  { title: '单位', dataIndex: 'company', key: 'company', width: 160, ellipsis: true },
  { title: '手机号', dataIndex: 'phoneMasked', key: 'phoneMasked', width: 130 },
  // 线索类型排在前面：预约测算、预约演示是最该优先跟进的
  { title: '线索类型', key: 'leadType', width: 120 },
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
const leadType = ref<FeedbackLeadType | typeof LEAD_TYPE_NONE>()
const feedbackType = ref<FeedbackType>()
// 状态初值取自路由 query：数据仪表盘点「待处理反馈数」跳转时带 status=pending
const status = ref<FeedbackStatus | undefined>(resolveInitialStatus())
const dateRange = ref<[string, string]>()

const detailOpen = ref(false)
const detailId = ref<number | null>(null)
const notifyOpen = ref(false)
const exporting = ref(false)

/**
 * 收集当前筛选条件
 * 列表与导出共用，避免两处各写一份而导致导出口径与列表不一致
 */
const currentFilters = () => ({
  keyword: keyword.value || undefined,
  source: source.value,
  leadType: leadType.value,
  feedbackType: feedbackType.value,
  status: status.value,
  startDate: dateRange.value?.[0],
  endDate: dateRange.value?.[1],
})

const {
  loading, rows, selectedKeys, page, pageSize, total,
  fetchList, search, onPageChange, onSelectChange, refreshAfterRemove,
} = useServerListPage<FeedbackListItem>((query) =>
  getFeedbackList({
    ...currentFilters(),
    page: query.page,
    pageSize: query.pageSize,
  }),
)

// 重置：清空全部筛选条件后回到首页重查
const onResetFilters = () => {
  keyword.value = ''
  source.value = undefined
  leadType.value = undefined
  feedbackType.value = undefined
  status.value = undefined
  dateRange.value = undefined
  search()
}

/**
 * 按当前筛选条件导出 xlsx
 * 无数据时后端回业务 JSON 而非文件流，需先判别再决定是保存还是提示
 */
const onExport = async () => {
  exporting.value = true
  try {
    const res = await exportFeedback(currentFilters())
    const failure = await readBlobError(res.data)
    if (failure) {
      message.warning(failure.message || EXPORT_FAILED)
      return
    }
    // 跨域部署时 Content-Disposition 可能不可读，用本地时间兜底命名
    const fileName = parseFileName(res.headers['content-disposition'] as string | undefined)
    saveBlob(res.data, fileName || `意见反馈-${Date.now()}.xlsx`)
  } catch {
    message.error(EXPORT_FAILED)
  } finally {
    exporting.value = false
  }
}

/** 表格分页变更 */
const onTableChange = (pag: { current?: number; pageSize?: number }) =>
  onPageChange(pag.current || 1, pag.pageSize || pageSize.value)
/** 打开处理弹窗；详情由弹窗自己取（列表只有遮蔽手机号且不含回复线程） */
const openDetail = (id: number) => {
  detailId.value = id
  detailOpen.value = true
}

// 看板点某条最新留言跳过来时带 ?id=，进页即打开它的处理弹窗
const queryId = Number(route.query.id)
if (Number.isInteger(queryId) && queryId > 0) openDetail(queryId)

/** 删除单条留言（连带其回复记录）；网络异常也要给提示，不能像点了没反应 */
const onDelete = async (id: number) => {
  try {
    const res = await deleteFeedback(id)
    if (res.data.code !== 200) {
      message.error(res.data.message || DELETE_FAILED)
      return
    }
    message.success(DELETE_SUCCESS)
    await refreshAfterRemove(1)
    void refreshPendingBadge(true)
  } catch {
    message.error(DELETE_FAILED)
  }
}

/** 批量删除选中留言 */
const onBatchDelete = async () => {
  const ids = [...selectedKeys.value]
  if (!ids.length) return
  try {
    const res = await batchDeleteFeedback(ids)
    if (res.data.code !== 200) {
      message.error(res.data.message || DELETE_FAILED)
      return
    }
    message.success(DELETE_SUCCESS)
    // 用后端返回的实际删除数，并发场景下可能少于请求条数
    await refreshAfterRemove(res.data.data?.removed ?? ids.length)
    void refreshPendingBadge(true)
  } catch {
    message.error(DELETE_FAILED)
  }
}
</script>
<style scoped>
.page-title {
  margin-bottom: 16px;
  font-size: 18px;
  font-weight: 600;
}

/* 查询条件独立成浅灰区块；下方 .actions 为功能操作行，靠右，与内容列表页一致 */
.toolbar {
  margin-bottom: 16px;
  padding: 16px;
  background: #fafafa;
  border-radius: 6px;
}

.actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.actions-title {
  font-size: 15px;
  font-weight: 600;
  color: #262626;
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


/* 普通留言弱化显示，让预约线索的标签更醒目 */
.muted {
  color: rgba(0, 0, 0, 0.45);
}
</style>
