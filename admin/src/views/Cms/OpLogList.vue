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
        <!-- 有姓名时「姓名 + 账号」，无姓名时只显示账号，不重复出现两次（SRS 3.5.18） -->
        <template v-if="column.key === 'operator'">
          <template v-if="record.adminName">
            {{ record.adminName }}
            <span class="account">{{ record.adminAccount }}</span>
          </template>
          <template v-else>{{ record.adminAccount }}</template>
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

    <a-modal v-model:open="detailOpen" title="操作日志详情" :footer="null" width="640px">
      <div v-if="detail" class="detail">
        <dl class="detail-list">
          <div class="detail-row">
            <dt>操作人：</dt>
            <dd>{{ detail.adminName ? `${detail.adminName}（${detail.adminAccount}）` : detail.adminAccount }}</dd>
          </div>
          <div class="detail-row">
            <dt>操作时间：</dt>
            <dd>{{ formatTime(detail.createdAt) }}</dd>
          </div>
          <div class="detail-row">
            <dt>操作类型：</dt>
            <dd><a-tag color="blue">{{ detail.action }}</a-tag></dd>
          </div>
          <div class="detail-row">
            <dt>所属模块：</dt>
            <dd>{{ detail.module }}</dd>
          </div>
          <div class="detail-row">
            <dt>接口：</dt>
            <dd>
              <a-tag :color="METHOD_COLOR[detail.method] || 'default'" class="method-tag">{{ detail.method }}</a-tag>
              <code class="mono">{{ detail.path }}</code>
            </dd>
          </div>
          <div class="detail-row">
            <dt>结果：</dt>
            <dd>
              <a-tag :color="detail.result === 'success' ? 'green' : 'red'">
                {{ OP_LOG_RESULT_LABEL[detail.result] }}
              </a-tag>
            </dd>
          </div>
          <div v-if="detail.errorMessage" class="detail-row">
            <dt>失败原因：</dt>
            <dd class="error-text">{{ detail.errorMessage }}</dd>
          </div>
          <div class="detail-row">
            <dt>来源 IP：</dt>
            <dd class="mono">{{ detail.ip || '-' }}</dd>
          </div>
        </dl>

        <!-- 请求参数：能解析成对象就拆成字段表，截断或非 JSON 时回退为原文 -->
        <section class="panel">
          <div class="panel-title"><span>请求参数</span></div>
          <a-table
            v-if="paramRows.length"
            :columns="paramColumns"
            :data-source="paramRows"
            row-key="field"
            size="small"
            :pagination="false"
          >
            <template #bodyCell="{ column, record }">
              <span v-if="column.key === 'field'" class="field-name">{{ record.field }}</span>
              <span v-else class="field-value">{{ record.value }}</span>
            </template>
          </a-table>
          <pre v-else class="params">{{ detail.params || '无' }}</pre>
        </section>
      </div>
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

/** 请求方法标签配色：新增 / 修改 / 删除一眼区分 */
const METHOD_COLOR: Record<string, string> = {
  POST: 'green', PUT: 'orange', PATCH: 'orange', DELETE: 'red',
}

const paramColumns = [
  { title: '字段', key: 'field', width: 190 },
  { title: '值', key: 'value' },
]

interface ParamRow { field: string; value: string }

/** 标量原样显示，对象/数组转成单行 JSON；长度由后端已截断 */
const stringify = (v: unknown): string => {
  if (v === null) return 'null'
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

/**
 * 把 {"query":{...},"body":{...}} 拍平成「字段 / 值」行；body 字段直接用字段名，
 * query 字段加「query.」前缀避免同名混淆。后端超长会截断成非法 JSON，
 * 解析失败时返回空数组，页面回退为显示原文
 */
const flattenParams = (raw: string | null): ParamRow[] => {
  if (!raw) return []
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    return []
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return []
  const { query, body } = data as { query?: unknown; body?: unknown }
  const rows: ParamRow[] = []
  const push = (source: unknown, prefix: string) => {
    if (!source || typeof source !== 'object') return
    for (const [k, v] of Object.entries(source)) rows.push({ field: `${prefix}${k}`, value: stringify(v) })
  }
  push(query, 'query.')
  if (Array.isArray(body)) rows.push({ field: 'body', value: stringify(body) })
  else push(body, '')
  return rows
}

const paramRows = computed(() => flattenParams(detail.value?.params ?? null))

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

/* 查询条件独立成浅灰区块，与其他列表页一致 */
.toolbar {
  margin-bottom: 16px;
  padding: 16px;
  background: #fafafa;
  border-radius: 6px;
}

/* 账号作为姓名的补充说明，弱化展示 */
.account {
  margin-left: 6px;
  color: #8c8c8c;
  font-size: 12px;
}

/* 详情：标签 + 值的无边框行，标签列定宽对齐 */
.detail-list { margin: 8px 0 20px; }
.detail-row {
  display: flex;
  align-items: flex-start;
  padding: 7px 0;
  line-height: 22px;
}
.detail-row dt {
  flex: none;
  width: 88px;
  margin: 0;
  color: #595959;
}
.detail-row dd {
  flex: 1;
  min-width: 0;
  margin: 0;
  color: #262626;
  word-break: break-all;
}
.method-tag { margin-right: 8px; font-weight: 600; }
.error-text { color: #cf1322; }
.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 13px;
}

/* 参数区：灰底卡片，居中小标题两侧带分隔线 */
.panel {
  padding: 14px 16px 16px;
  background: #fafafa;
  border-radius: 8px;
}
.panel-title {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  color: #8c8c8c;
  font-size: 12px;
}
.panel-title::before,
.panel-title::after {
  content: '';
  flex: 1;
  height: 1px;
  background: #e8e8e8;
}
.field-name { color: #595959; font-weight: 500; }
.field-value {
  color: #262626;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 13px;
  word-break: break-all;
}

/* 参数无法拆成字段时的原文，限高滚动而非撑开弹窗 */
.params {
  margin: 0;
  max-height: 240px;
  overflow: auto;
  padding: 10px 12px;
  background: #fff;
  border-radius: 6px;
  white-space: pre-wrap;
  word-break: break-all;
  font-size: 12px;
  line-height: 1.6;
}
</style>