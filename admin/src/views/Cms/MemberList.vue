<template>
  <div class="member-list">
    <div class="page-title">会员管理</div>

    <div class="toolbar">
      <a-space :size="12" wrap>
        <a-range-picker
          v-model:value="dateRange"
          value-format="YYYY-MM-DD"
          :placeholder="['注册开始日期', '注册结束日期']"
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
          placeholder="手机号 / 昵称 / 邮箱"
          style="width: 240px"
          allow-clear
          @search="search"
        />
      </a-space>
    </div>

    <a-table
      :columns="columns"
      :data-source="rows"
      :loading="loading"
      :pagination="pagination"
      row-key="id"
      size="middle"
      @change="onTableChange"
    >
      <template #emptyText>
        <a-empty description="暂无会员数据" />
      </template>
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'status'">
          <a-tag :color="MEMBER_STATUS_COLOR[record.status as MemberStatus]">
            {{ MEMBER_STATUS_LABEL[record.status as MemberStatus] }}
          </a-tag>
        </template>
        <template v-else-if="column.key === 'action'">
          <a-space :size="4">
            <a-button type="link" size="small" @click="openDetail(record.id)">详情</a-button>
            <a-button
              v-if="record.status === 'normal'"
              type="link"
              size="small"
              @click="onToggleStatus(record.id, 'disabled')"
            >
              禁用
            </a-button>
            <a-button v-else type="link" size="small" @click="onToggleStatus(record.id, 'normal')">
              启用
            </a-button>
            <a-popconfirm
              title="确认删除该会员？删除后其登录日志与已提交反馈仍保留。"
              ok-text="确定"
              cancel-text="取消"
              @confirm="onDelete(record.id)"
            >
              <a-button type="link" size="small" danger>删除</a-button>
            </a-popconfirm>
          </a-space>
        </template>
      </template>
    </a-table>
    <!-- 会员详情：展示完整联系方式，锁定中可解锁，可重置密码 -->
    <a-modal v-model:open="detailVisible" title="会员详情" :footer="null" width="600px">
      <a-descriptions v-if="current" :column="1" bordered size="small">
        <a-descriptions-item label="昵称">{{ current.nickname }}</a-descriptions-item>
        <a-descriptions-item label="手机号">{{ current.phone }}</a-descriptions-item>
        <a-descriptions-item label="邮箱">{{ current.email || '-' }}</a-descriptions-item>
        <a-descriptions-item label="状态">
          <a-tag :color="MEMBER_STATUS_COLOR[current.status]">
            {{ MEMBER_STATUS_LABEL[current.status] }}
          </a-tag>
          <a-tag v-if="isLocked(current.lockedUntil)" color="orange">
            风控锁定至 {{ formatTime(current.lockedUntil) }}
          </a-tag>
        </a-descriptions-item>
        <a-descriptions-item label="注册 IP">{{ current.registerIp || '-' }}</a-descriptions-item>
        <a-descriptions-item label="注册时间">{{ formatTime(current.createdAt) }}</a-descriptions-item>
        <a-descriptions-item label="最近登录">{{ formatTime(current.lastLoginAt) }}</a-descriptions-item>
      </a-descriptions>

      <div v-if="current" class="modal-actions">
        <a-button v-if="isLocked(current.lockedUntil)" :loading="acting" @click="onUnlock">
          解除锁定
        </a-button>
        <a-button :loading="acting" @click="openReset">重置密码</a-button>
      </div>
    </a-modal>

    <!-- 重置密码：由管理员直接设定新密码 -->
    <a-modal
      v-model:open="resetVisible"
      title="重置会员密码"
      :confirm-loading="acting"
      ok-text="确定"
      cancel-text="取消"
      @ok="onReset"
    >
      <a-form layout="vertical">
        <a-form-item label="新密码" required>
          <a-input-password
            v-model:value="newPassword"
            placeholder="6-64 位，建议包含字母与数字"
            autocomplete="new-password"
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>
<script setup lang="ts">
// 会员管理：筛选 / 详情 / 启用禁用 / 解锁 / 重置密码 / 删除（会员由前台注册产生，后台不新增）
import { computed, ref } from 'vue'
import { message } from 'ant-design-vue'
import {
  getMemberList, getMemberDetail, updateMemberStatus, resetMemberPassword, deleteMember,
  isLocked, MEMBER_STATUS_COLOR, MEMBER_STATUS_LABEL,
  type MemberDetail, type MemberListItem, type MemberStatus,
} from '@/api/member'
import { useServerListPage } from '@/composables/useServerListPage'
import { DELETE_SUCCESS, DELETE_FAILED, SAVE_SUCCESS, SAVE_FAILED } from '@/constants/ui'

/** 时间展示：空值补占位，避免表格出现空白单元格 */
const formatTime = (value: string | null) =>
  value ? new Date(value).toLocaleString('zh-CN', { hour12: false }) : '-'

const columns = [
  { title: '昵称', dataIndex: 'nickname', key: 'nickname', width: 140 },
  { title: '手机号', dataIndex: 'phoneMasked', key: 'phoneMasked', width: 140 },
  { title: '邮箱', dataIndex: 'emailMasked', key: 'emailMasked', width: 200 },
  { title: '状态', key: 'status', width: 90 },
  {
    title: '最近登录', dataIndex: 'lastLoginAt', key: 'lastLoginAt', width: 170,
    customRender: ({ text }: { text: string | null }) => formatTime(text),
  },
  {
    title: '注册时间', dataIndex: 'createdAt', key: 'createdAt', width: 170,
    customRender: ({ text }: { text: string | null }) => formatTime(text),
  },
  { title: '操作', key: 'action', width: 200, align: 'center' as const },
]

const statusOptions = [
  { value: 'normal', label: '正常' },
  { value: 'disabled', label: '已禁用' },
]

// 本页独有筛选条件，由闭包传入取数函数
const keyword = ref('')
const status = ref<MemberStatus>()
const dateRange = ref<[string, string]>()

const detailVisible = ref(false)
const resetVisible = ref(false)
const current = ref<MemberDetail | null>(null)
const newPassword = ref('')
const acting = ref(false)

const {
  loading, rows, page, pageSize, total,
  fetchList, search, onPageChange, refreshAfterRemove,
} = useServerListPage<MemberListItem>((query) =>
  getMemberList({
    keyword: keyword.value || undefined,
    status: status.value,
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

/** 表格分页/排序变更 */
const onTableChange = (pag: { current?: number; pageSize?: number }) =>
  onPageChange(pag.current || 1, pag.pageSize || pageSize.value)
/** 打开详情：列表只有遮蔽字段，需另取详情拿完整联系方式与锁定状态 */
const openDetail = async (id: number) => {
  const res = await getMemberDetail(id)
  if (res.data.code !== 200 || !res.data.data) {
    message.error(res.data.message || '会员详情加载失败')
    return
  }
  current.value = res.data.data
  detailVisible.value = true
}

/** 启用 / 禁用；置为 normal 时后端同步解除锁定 */
const onToggleStatus = async (id: number, next: MemberStatus) => {
  try {
    const res = await updateMemberStatus(id, next)
    if (res.data.code !== 200) {
      message.error(res.data.message || SAVE_FAILED)
      return
    }
    message.success(next === 'disabled' ? '已禁用' : '已启用')
    fetchList()
  } catch {
    message.error(SAVE_FAILED)
  }
}

/** 解除风控锁定：复用状态接口置为 normal，后端会清空锁定时间与失败计数 */
const onUnlock = async () => {
  if (!current.value) return
  acting.value = true
  try {
    const res = await updateMemberStatus(current.value.id, 'normal')
    if (res.data.code !== 200) {
      message.error(res.data.message || SAVE_FAILED)
      return
    }
    message.success('已解除锁定')
    detailVisible.value = false
    fetchList()
  } catch {
    message.error(SAVE_FAILED)
  } finally {
    acting.value = false
  }
}

const openReset = () => {
  newPassword.value = ''
  resetVisible.value = true
}

/** 重置密码：长度交由后端校验，此处只做非空与长度下限拦截 */
const onReset = async () => {
  if (!current.value) return
  const value = newPassword.value.trim()
  if (value.length < 6 || value.length > 64) {
    message.warning('新密码长度需为 6-64 位')
    return
  }
  acting.value = true
  try {
    const res = await resetMemberPassword(current.value.id, value)
    if (res.data.code !== 200) {
      message.error(res.data.message || SAVE_FAILED)
      return
    }
    message.success(SAVE_SUCCESS)
    resetVisible.value = false
    newPassword.value = ''
  } catch {
    message.error(SAVE_FAILED)
  } finally {
    acting.value = false
  }
}

const onDelete = async (id: number) => {
  try {
    const res = await deleteMember(id)
    if (res.data.code !== 200) {
      message.error(res.data.message || DELETE_FAILED)
      return
    }
    message.success(DELETE_SUCCESS)
    refreshAfterRemove(1)
  } catch {
    message.error(DELETE_FAILED)
  }
}
</script>

<style scoped>
.member-list {
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

.toolbar {
  margin-bottom: 16px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
}
</style>
