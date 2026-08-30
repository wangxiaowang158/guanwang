<template>
  <div ref="tableWrap" class="content-list">
    <div class="page-title">{{ channel.name }}</div>

    <!-- 筛选 + 新增 + 批量删除 -->
    <div class="toolbar">
      <a-space :size="12">
        <a-range-picker
          v-model:value="dateRange"
          value-format="YYYY-MM-DD"
          :placeholder="['创建日期', '']"
          @change="fetchList"
        />
        <a-input-search
          v-model:value="keyword"
          placeholder="输入关键字"
          style="width: 240px"
          allow-clear
          @search="fetchList"
        />
      </a-space>
      <a-space :size="12">
        <a-button type="primary" @click="goEdit()">
          <template #icon><PlusOutlined /></template>
          新增
        </a-button>
        <a-popconfirm
          title="确认删除选中的数据？"
          ok-text="确定"
          cancel-text="取消"
          :disabled="!selectedKeys.length"
          @confirm="onBatchDelete"
        >
          <a-button :disabled="!selectedKeys.length">批量删除</a-button>
        </a-popconfirm>
      </a-space>
    </div>

    <!-- 列表 -->
    <a-table
      :columns="columns"
      :data-source="pagedData"
      :loading="loading"
      :pagination="false"
      row-key="id"
      :row-selection="{ selectedRowKeys: selectedKeys, onChange: onSelectChange }"
      size="middle"
    >
      <template #bodyCell="{ column, record, index }">
        <!-- 序号 -->
        <template v-if="column.key === 'index'">
          {{ (page - 1) * pageSize + index + 1 }}
        </template>
        <!-- 标题/名称：文字后跟拖拽手柄，按住上下拖动调整顺序 -->
        <template v-else-if="column.key === 'title'">
          <span class="name-cell">
            <span class="name-text">{{ record.title || record.name || '-' }}</span>
            <a-tooltip title="按住拖动调整排序">
              <ControlOutlined class="sort-drag-handle" />
            </a-tooltip>
          </span>
        </template>
        <template v-else-if="column.key === 'name'">
          <span class="name-cell">
            <span class="name-text">{{ record.name || record.title || '-' }}</span>
            <a-tooltip title="按住拖动调整排序">
              <ControlOutlined class="sort-drag-handle" />
            </a-tooltip>
          </span>
        </template>
        <template v-else-if="column.key === 'brand'">
          <a-button type="link" size="small" disabled>品牌管理</a-button>
        </template>
        <!-- 置顶 -->
        <template v-else-if="column.key === 'isTop'">
          <a-tooltip :title="record.isTop ? '取消置顶' : '置顶'">
            <ArrowUpOutlined
              :class="['top-icon', { active: record.isTop }]"
              @click="onToggleTop(record)"
            />
          </a-tooltip>
        </template>
        <!-- 修改 -->
        <template v-else-if="column.key === 'edit'">
          <SettingOutlined class="op-icon" @click="goEdit(record.id)" />
        </template>
        <!-- 删除 -->
        <template v-else-if="column.key === 'delete'">
          <a-popconfirm title="确认删除该条数据？" ok-text="确定" cancel-text="取消" @confirm="onDelete(record.id)">
            <DeleteOutlined class="op-icon danger" />
          </a-popconfirm>
        </template>
      </template>
    </a-table>

    <!-- 分页 -->
    <div class="footer-bar">
      <a-pagination
        v-model:current="page"
        v-model:page-size="pageSize"
        :total="total"
        :show-size-changer="true"
        :page-size-options="['10', '20', '50']"
        show-less-items
      />
    </div>
  </div>
</template>

<script setup lang="ts">
// 通用内容列表页：筛选 / 排序 / 置顶 / 修改 / 删除 / 全选 / 批量删除 / 新增
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import Sortable from 'sortablejs'
import {
  PlusOutlined, SettingOutlined, DeleteOutlined, ArrowUpOutlined,
  ControlOutlined
} from '@ant-design/icons-vue'
import {
  getContentList, deleteContent, toggleContentTop, updateContentSort,
  type Channel, type Content
} from '@/api/cms'
import { COLUMN_LABELS } from './fieldDefs'

const props = defineProps<{ channel: Channel }>()
const router = useRouter()

const loading = ref(false)
const rows = ref<Content[]>([])
const keyword = ref('')
const dateRange = ref<[string, string]>()
const selectedKeys = ref<number[]>([])
const tableWrap = ref<HTMLElement>()

// 分页（前端分页，mock 返回全量）
const page = ref(1)
const pageSize = ref(10)
const total = computed(() => rows.value.length)
const pagedData = computed(() =>
  rows.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value)
)

// 动态列：按栏目 listColumns + 固定操作列（sort 不再单列，拖拽手柄并入标题/名称列）
const columns = computed(() => {
  const cols = props.channel.listColumns
    .filter((key) => key !== 'sort')
    .map((key) => {
      if (key === 'index') return { title: '序号', key: 'index', width: 80, align: 'center' as const }
      if (key === 'isTop') return { title: '置顶', key: 'isTop', width: 80, align: 'center' as const }
      if (key === 'createTime') return { title: '创建日期', dataIndex: 'createTime', key: 'createTime', width: 180 }
      return { title: COLUMN_LABELS[key] || key, key, dataIndex: key }
    })
  cols.push({ title: '修改', key: 'edit', width: 70, align: 'center' as const })
  cols.push({ title: '删除', key: 'delete', width: 70, align: 'center' as const })
  return cols
})

const fetchList = async () => {
  loading.value = true
  try {
    const res = await getContentList({
      channelKey: props.channel.key,
      keyword: keyword.value || undefined,
      startDate: dateRange.value?.[0],
      endDate: dateRange.value?.[1]
    })
    if (res.data.code === 200) {
      rows.value = res.data.data
      page.value = 1
      selectedKeys.value = []
    }
  } catch {
    message.error('获取列表失败')
  } finally {
    loading.value = false
  }
}

const onSelectChange = (keys: (string | number)[]) => {
  selectedKeys.value = keys as number[]
}

// 跳转编辑/新增全页表单
const goEdit = (id?: number) => {
  router.push(id ? `/cms/${props.channel.key}/edit/${id}` : `/cms/${props.channel.key}/edit`)
}

const onToggleTop = async (record: Content) => {
  try {
    await toggleContentTop(props.channel.key, record.id)
    record.isTop = !record.isTop
    message.success('操作成功')
  } catch {
    message.error('操作失败')
  }
}

// 拖拽结束：以 DOM 的 data-row-key 顺序为准重排当前页，并把排序值降序回写
// 用 key 定位而非位置索引，规避 a-table tbody 中的 measure-row 造成的索引错位
const onDragReorder = async (tbody: HTMLElement) => {
  const base = (page.value - 1) * pageSize.value
  const list = rows.value
  const oldPageRows = list.slice(base, base + pageSize.value)

  // 读取拖拽后真实数据行的 id 顺序（仅 tr[data-row-key]，排除测量行）
  const keyOrder = Array.from(tbody.querySelectorAll('tr[data-row-key]'))
    .map((tr) => Number((tr as HTMLElement).dataset.rowKey))
  const byId = new Map(oldPageRows.map((r) => [r.id, r]))
  const newPageRows = keyOrder.map((id) => byId.get(id)).filter(Boolean) as Content[]
  if (newPageRows.length !== oldPageRows.length) { fetchList(); return }

  // 顺序未变则不处理
  if (newPageRows.every((r, i) => r.id === oldPageRows[i].id)) return

  // 禁止跨置顶边界拖动（前置条件：服务端按 isTop 优先返回，置顶行聚集在页首 topCount 位）
  const topCount = oldPageRows.filter((r) => r.isTop).length
  const crossed = newPageRows.some((r, i) => r.isTop !== (i < topCount))
  if (crossed) {
    message.warning('置顶与非置顶内容不能互换位置')
    fetchList() // 重载以还原被拖动的 DOM
    return
  }

  // 把新顺序写回全量数组当前页区间
  list.splice(base, oldPageRows.length, ...newPageRows)

  // 取当前页排序值池，按降序重新分配给新顺序（保持数值池不变）
  const sortPool = newPageRows.map((r) => r.sort ?? 0).sort((a, b) => b - a)
  const changed: Content[] = []
  newPageRows.forEach((r, i) => {
    if (r.sort !== sortPool[i]) {
      r.sort = sortPool[i]
      changed.push(r)
    }
  })

  try {
    await Promise.all(
      changed.map((r) => updateContentSort(props.channel.key, r.id, r.sort ?? 0))
    )
    message.success('排序已更新')
  } catch {
    message.error('排序更新失败')
    fetchList()
  }
}

let sortable: Sortable | null = null
// 在表格 tbody 上初始化拖拽，仅排序手柄可触发
const initSortable = async () => {
  await nextTick()
  sortable?.destroy()
  const tbody = tableWrap.value?.querySelector('.ant-table-tbody') as HTMLElement | null
  if (!tbody) return
  sortable = Sortable.create(tbody, {
    handle: '.sort-drag-handle',
    animation: 150,
    onEnd: () => onDragReorder(tbody)
  })
}

const onDelete = async (id: number) => {
  try {
    await deleteContent(props.channel.key, [id])
    message.success('删除成功')
    fetchList()
  } catch {
    message.error('删除失败')
  }
}

const onBatchDelete = async () => {
  try {
    await deleteContent(props.channel.key, selectedKeys.value)
    message.success('删除成功')
    fetchList()
  } catch {
    message.error('删除失败')
  }
}

onMounted(fetchList)
// 切换栏目时重置并重新加载
watch(() => props.channel.key, () => {
  keyword.value = ''
  dateRange.value = undefined
  fetchList()
})
// 行集合变化（翻页/页容量/重载）后重建拖拽实例；纯排序拖动不触发，避免打断动画
watch(
  () => [props.channel.key, page.value, pageSize.value, rows.value.length].join('|'),
  () => { initSortable() }
)
onBeforeUnmount(() => { sortable?.destroy() })
</script>

<style scoped>
.content-list {
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
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.name-cell {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.name-text {
  flex: 1;
}

.sort-drag-handle {
  cursor: grab;
  color: #bfbfbf;
  font-size: 16px;
}

.sort-drag-handle:hover {
  color: #2f7cff;
}

.sort-drag-handle:active {
  cursor: grabbing;
}

.top-icon {
  cursor: pointer;
  color: #bfbfbf;
  font-size: 16px;
}

.top-icon.active {
  color: #faad14;
}

.op-icon {
  cursor: pointer;
  color: #8c8c8c;
  font-size: 16px;
}

.op-icon:hover {
  color: #2f7cff;
}

.op-icon.danger:hover {
  color: #ff4d4f;
}

.footer-bar {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  margin-top: 16px;
}
</style>
