<template>
  <div class="login-log-list">
    <div class="page-title">登录日志</div>

    <div class="toolbar">
      <a-space :size="12" wrap>
        <a-range-picker
          v-model:value="dateRange"
          value-format="YYYY-MM-DD"
          :placeholder="['登录开始日期', '登录结束日期']"
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
          placeholder="昵称 / 登录账号 / IP"
          style="width: 220px"
          allow-clear
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
        <template v-if="column.key === 'nickname'">
          {{ record.nickname || '-' }}
        </template>
        <template v-else-if="column.key === 'loginMethod'">
          {{ LOGIN_METHOD_LABEL[record.loginMethod as LoginMethod] }}
        </template>
        <template v-else-if="column.key === 'result'">
          <a-tag :color="record.result === 'success' ? 'green' : 'red'">
            {{ LOGIN_RESULT_LABEL[record.result as LoginResult] }}
          </a-tag>
        </template>
        <template v-else-if="column.key === 'failReason'">
          {{ reasonLabel(record.failReason) }}
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
    >
      <a-alert
        type="warning"
        show-icon
        message="清理不可撤销"
        description="将永久删除所选日期零点之前的全部登录日志，请谨慎操作。"
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
  </div>
</template>
<script setup lang="ts">
// 登录日志：只读列表 + 按日期清理；失败原因仅后台可见（前台统一提示，防账号枚举）
import { computed, ref } from 'vue'
import { message } from 'ant-design-vue'
import {
  getLoginLogList, clearLoginLog,
  LOGIN_METHOD_LABEL, LOGIN_RESULT_LABEL, LOGIN_FAIL_REASON_LABEL,
  type LoginFailReason, type LoginLogItem, type LoginMethod, type LoginResult,
} from '@/api/loginLog'
import { useServerListPage } from '@/composables/useServerListPage'

/** 时间展示：空值补占位，避免表格出现空白单元格 */
const formatTime = (value: string | null) =>
  value ? new Date(value).toLocaleString('zh-CN', { hour12: false }) : '-'

/** 失败原因展示：成功记录无该值 */
const reasonLabel = (value: LoginFailReason | null) =>
  value ? LOGIN_FAIL_REASON_LABEL[value] : '-'

const resultOptions = (Object.keys(LOGIN_RESULT_LABEL) as LoginResult[]).map((value) => ({
  value,
  label: LOGIN_RESULT_LABEL[value],
}))

const columns = [
  { title: '会员昵称', key: 'nickname', width: 130 },
  { title: '登录账号', dataIndex: 'loginAccount', key: 'loginAccount', width: 140 },
  { title: '方式', key: 'loginMethod', width: 110 },
  { title: '结果', key: 'result', width: 90 },
  { title: '失败原因', key: 'failReason', width: 130 },
  { title: '登录 IP', dataIndex: 'loginIp', key: 'loginIp', width: 140 },
  { title: '设备信息', dataIndex: 'deviceInfo', key: 'deviceInfo', ellipsis: true },
  {
    title: '登录时间', dataIndex: 'createdAt', key: 'createdAt', width: 170,
    customRender: ({ text }: { text: string | null }) => formatTime(text),
  },
]
// 本页独有筛选条件，由闭包传入取数函数
const keyword = ref('')
const result = ref<LoginResult>()
const dateRange = ref<[string, string]>()

const clearOpen = ref(false)
const clearBefore = ref<string>()
const clearing = ref(false)

const {
  loading, rows, page, pageSize, total,
  search, onPageChange,
} = useServerListPage<LoginLogItem>((query) =>
  getLoginLogList({
    keyword: keyword.value || undefined,
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

/** 清理指定日期零点之前的日志；不可撤销，清理后回到第一页 */
const onClear = async () => {
  if (!clearBefore.value) {
    message.warning('请选择清理截止日期')
    return
  }
  clearing.value = true
  try {
    const res = await clearLoginLog(clearBefore.value)
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
</style>
