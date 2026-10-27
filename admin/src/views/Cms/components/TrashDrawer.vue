<template>
  <!-- 回收站：本栏目已删除的内容，可恢复或彻底删除；超过保留期由系统自动清理 -->
  <a-drawer :open="open" title="回收站" width="760" @close="emit('update:open', false)">
    <a-alert
      type="info"
      show-icon
      class="tip"
      :message="`删除的内容在此保留 ${retentionDays} 天，期间可随时恢复；超期后系统自动彻底删除。`"
    />
    <a-space class="ops">
      <a-button :disabled="!selectedKeys.length" :loading="busy" @click="onRestore(selectedKeys)">恢复选中</a-button>
      <a-popconfirm
        :title="`确定彻底删除选中的 ${selectedKeys.length} 条吗？删除后无法恢复`"
        ok-type="danger"
        ok-text="彻底删除"
        cancel-text="取消"
        :disabled="!selectedKeys.length"
        @confirm="onPurge(selectedKeys)"
      >
        <a-button danger :disabled="!selectedKeys.length">彻底删除选中</a-button>
      </a-popconfirm>
    </a-space>
    <a-table
      :columns="COLUMNS"
      :data-source="rows"
      :loading="loading"
      :pagination="pagination"
      row-key="id"
      size="middle"
      :row-selection="{ selectedRowKeys: selectedKeys, onChange: (keys: (string | number)[]) => (selectedKeys = keys as number[]) }"
      @change="onTableChange"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'title'">{{ record.title || record.name || '-' }}</template>
        <template v-else-if="column.key === 'ops'">
          <a-space :size="4">
            <a-button type="link" size="small" @click="onRestore([record.id])">恢复</a-button>
            <a-popconfirm
              title="确定彻底删除吗？删除后无法恢复"
              ok-type="danger"
              ok-text="彻底删除"
              cancel-text="取消"
              @confirm="onPurge([record.id])"
            >
              <a-button type="link" size="small" danger>彻底删除</a-button>
            </a-popconfirm>
          </a-space>
        </template>
      </template>
      <template #emptyText>
        <a-empty description="回收站是空的" />
      </template>
    </a-table>
  </a-drawer>
</template>

<script setup lang="ts">
// 内容回收站抽屉：列出本栏目已删除的内容，恢复后回到列表，彻底删除不可撤销
import { computed, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { getTrashList, purgeTrash, restoreTrash, type Content } from '@/api/cms'

const props = defineProps<{ open: boolean; channelKey: string }>()
/** restored：有内容被恢复，父级据此刷新列表 */
const emit = defineEmits<{ 'update:open': [boolean]; restored: [] }>()

const COLUMNS = [
  { title: '标题', key: 'title' },
  { title: '删除时间', dataIndex: 'deletedAt', key: 'deletedAt', width: 180 },
  { title: '操作', key: 'ops', width: 160, align: 'center' as const },
]

const loading = ref(false)
const busy = ref(false)
const rows = ref<(Content & { deletedAt: string })[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
/** 后端下发的保留天数，加载前先按默认值展示 */
const retentionDays = ref(30)
const selectedKeys = ref<number[]>([])

const pagination = computed(() => ({
  current: page.value,
  pageSize: pageSize.value,
  total: total.value,
  showTotal: (count: number) => `共 ${count} 条`,
}))

const fetchList = async () => {
  loading.value = true
  try {
    const res = await getTrashList({ channelKey: props.channelKey, page: page.value, pageSize: pageSize.value })
    if (res.data.code !== 200 || !res.data.data) {
      message.error(res.data.message || '回收站加载失败')
      return
    }
    const d = res.data.data
    // 删空最后一页后回退一页，避免停在空白页
    if (!d.list.length && d.total && page.value > 1) {
      page.value -= 1
      // 必须 await：否则外层 finally 先把 loading 置 false，回退页加载期间表格闪出空状态
      return await fetchList()
    }
    rows.value = d.list
    total.value = d.total
    retentionDays.value = d.retentionDays
    selectedKeys.value = []
  } catch {
    message.error('回收站加载失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

const onTableChange = (pag: { current?: number; pageSize?: number }) => {
  page.value = pag.current || 1
  pageSize.value = pag.pageSize || pageSize.value
  fetchList()
}

const onRestore = async (ids: number[]) => {
  if (!ids.length || busy.value) return
  busy.value = true
  try {
    const res = await restoreTrash(props.channelKey, ids)
    if (res.data.code !== 200) {
      message.error(res.data.message || '恢复失败')
      return
    }
    message.success(res.data.message || '已恢复')
    emit('restored')
    fetchList()
  } catch {
    message.error('恢复失败，请稍后重试')
  } finally {
    busy.value = false
  }
}

const onPurge = async (ids: number[]) => {
  if (!ids.length) return
  try {
    const res = await purgeTrash(props.channelKey, ids)
    if (res.data.code !== 200) {
      message.error(res.data.message || '删除失败')
      return
    }
    message.success(res.data.message || '已彻底删除')
    fetchList()
  } catch {
    message.error('删除失败，请稍后重试')
  }
}

// 每次打开都重新取：期间列表里可能又删了内容
watch(() => props.open, (opened) => {
  if (!opened) return
  page.value = 1
  fetchList()
})
</script>

<style scoped>
.tip { margin-bottom: 12px; }
.ops { margin-bottom: 12px; }
</style>
