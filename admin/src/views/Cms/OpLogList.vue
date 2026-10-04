<template>
  <div class="op-log-list">
    <div class="page-title">操作日志</div>

    <div class="toolbar">
      <a-space :size="12" wrap>
        <a-range-picker
          v-model:value="dateRange"
          value-format="YYYY-MM-DD"
          :placeholder="['操作开始日期', '操作结束日期']"
          @change="search"
        />
        <a-select
          v-model:value="moduleName"
          placeholder="全部模块"
          style="width: 160px"
          allow-clear
          :options="moduleOptions"
          @change="search"
        />
        <a-select
          v-model:value="result"
          placeholder="全部结果"
          style="width: 130px"
          allow-clear
          :options="resultOptions"
          @change="search"
        />
        <a-input-search
          v-model:value="keyword"
          placeholder="账号 / 姓名 / 操作 / IP"
          style="width: 220px"
          allow-clear
          :maxlength="50"
          @search="search"
        />
        <a-button danger @click="clearOpen = true">清理历史日志</a-button>
      </a-space>
    </div>

    <a-table
      :columns="columns"
      :data-source="rows"
      :loading="loading"
      row-key="id"
      size="middle"
      :pagination="pagination"
      @change="onTableChange"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'operator'">
          {{ record.adminName || record.adminAccount }}
          <span class="account">{{ record.adminAccount }}</span>
        </template>
        <template v-else-if="column.key === 'result'">
          <a-tag :color="record.result === 'success' ? 'green' : 'red'">
            {{ OP_LOG_RESULT_LABEL[record.result as OpLogResult] }}
          </a-tag>
        </template>
        <template v-else-if="column.key === 'detail'">
          <a-button type="link" size="small" @click="openDetail(record as OpLogItem)">查看</a-button>
        </template>
      </template>
    </a-table>

    <a-modal
      v-model:open="clearOpen"
      title="清理历史日志"
      :confirm-loading="clearing"
      ok-text="确认清理"
      :ok-button-props="{ danger: true }"
      @ok="onClear"
      @cancel="clearBefore = undefined"
    >
      <a-alert
        type="warning"
        show-icon
        message="清理不可撤销"
        description="将永久删除所选日期零点之前的全部操作日志，请谨慎操作。"
        style="margin-bottom: 16px"
      />
      <a-form :label-col="{ style: { width: '110px' } }">
        <a-form-item label="清理截止日期" required>
          <a-date-picker
            v-model:value="clearBefore"
            value-format="YYYY-MM-DD"
            placeholder="选择日期"
            style="width: 100%"
          />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal v-model:open="detailOpen" title="操作详情" :footer="null" width="640px">
      <a-descriptions v-if="detail" :column="1" size="small" bordered>
        <a-descriptions-item label="操作人">
          {{ detail.adminName || '-' }}（{{ detail.adminAccount }}）
        </a-descriptions-item>
        <a-descriptions-item label="操作">{{ detail.action }}</a-descriptions-item>
        <a-descriptions-item label="模块">{{ detail.module }}</a-descriptions-item>
        <a-descriptions-item label="接口">{{ detail.method }} {{ detail.path }}</a-descriptions-item>
        <a-descriptions-item label="来源 IP">{{ detail.ip || '-' }}</a-descriptions-item>
        <a-descriptions-item label="结果">
          {{ OP_LOG_RESULT_LABEL[detail.result] }}
          <span v-if="detail.errorMessage">（{{ detail.errorMessage }}）</span>
        </a-descriptions-item>
        <a-descriptions-item label="操作时间">{{ formatTime(detail.createdAt) }}</a-descriptions-item>
        <a-descriptions-item label="请求参数">
          <pre class="params">{{ detail.params || '无' }}</pre>
        </a-descriptions-item>
      </a-descriptions>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
// 操作日志：只读列表 + 按日期清理；日志由后端拦截器在每次写操作后自动写入
import { computed, onMounted, ref } from 'vue'
import { message } from 'ant-design-vue'
import {
  getOpLogList, getOpLogModules, clearOpLog,
  OP_LOG_RESULT_LABEL, type OpLogItem, type OpLogResult,
} from '@/api/opLog'
import { useServerListPage } from '@/composables/useServerListPage'

/** 时间展示：空值补占位，避免表格出现空白单元格 */
const formatTime = (value: string | null) =>
  value ? new Date(value).toLocaleString('zh-CN', { hour12: false }) : '-'

const resultOptions = (Object.keys(OP_LOG_RESULT_LABEL) as OpLogResult[]).map((value) => ({
  value,
  label: OP_LOG_RESULT_LABEL[value],
}))

const columns = [
  { title: '操作人', key: 'operator', width: 170 },
  { title: '模块', dataIndex: 'module', key: 'module', width: 130 },
  { title: '操作', dataIndex: 'action', key: 'action', ellipsis: true },
  { title: '结果', key: 'result', width: 90 },
  { title: '来源 IP', dataIndex: 'ip', key: 'ip', width: 140 },
  {
    title: '操作时间', dataIndex: 'createdAt', key: 'createdAt', width: 170,
    customRender: ({ text }: { text: string | null }) => formatTime(text),
  },
  { title: '详情', key: 'detail', width: 80 },
]

// 本页独有筛选条件，由闭包传入取数函数
const keyword = ref('')
const moduleName = ref<string>()
const result = ref<OpLogResult>()
const dateRange = ref<[string, string]>()

const moduleOptions = ref<{ value: string; label: string }[]>([])

const clearOpen = ref(false)
const clearBefore = ref<string>()
const clearing = ref(false)

const detailOpen = ref(false)
const detail = ref<OpLogItem | null>(null)

const {
  loading, rows, page, pageSize, total,
  search, onPageChange,
} = useServerListPage<OpLogItem>((query) =>
  getOpLogList({
    keyword: keyword.value || undefined,
    module: moduleName.value,
    result: result.value,
    startDate: dateRange.value?.[0],
    endDate: dateRange.value?.[1],
    page: query.page,
    pageSize: query.pageSize,
  }),
)

const pagination = computed(() => ({
  current: page.value,
  pageSize: pageSize.value,
  total: total.value,
  showSizeChanger: true,
  showTotal: (count: number) => `共 ${count} 条`,
}))

/** 表格分页变更 */
const onTableChange = (pag: { current?: number; pageSize?: number }) =>
  onPageChange(pag.current || 1, pag.pageSize || pageSize.value)

/** 打开详情弹窗 */
const openDetail = (record: OpLogItem) => {
  detail.value = record
  detailOpen.value = true
}

// 模块下拉由后端目录表下发，避免前后端各维护一份而失同步；失败静默降级为不可筛选
onMounted(async () => {
  try {
    const res = await getOpLogModules()
    if (res.data.code === 200 && Array.isArray(res.data.data)) {
      moduleOptions.value = res.data.data.map((name) => ({ value: name, label: name }))
    }
  } catch {
    moduleOptions.value = []
  }
})

/** 清理指定日期零点之前的日志；不可撤销，清理后回到第一页 */
const onClear = async () => {
  if (!clearBefore.value) {
    message.warning('请选择清理截止日期')
    return
  }
  clearing.value = true
  try {
    const res = await clearOpLog(clearBefore.value)
    if (res.data.code !== 200) {
      message.error(res.data.message || '清理失败')
      return
    }
    message.success(res.data.message || `已清理 ${res.data.data?.count ?? 0} 条日志`)
    clearOpen.value = false
    clearBefore.value = undefined
    await search()
  } catch {
    message.error('清理失败')
  } finally {
    clearing.value = false
  }
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

/* 账号作为姓名的补充说明，弱化展示 */
.account {
  margin-left: 6px;
  color: #8c8c8c;
  font-size: 12px;
}

/* 参数快照可能较长，限高滚动而非撑开弹窗 */
.params {
  margin: 0;
  max-height: 200px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-all;
  font-size: 12px;
  line-height: 1.6;
}
</style>