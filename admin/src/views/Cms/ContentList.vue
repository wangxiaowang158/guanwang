<template>
  <div ref="tableWrap" class="content-list">
    <ChannelTitle :channel="channel" />

    <!-- 筛选条件单独一行，功能操作（新增 / 批量删除）在下一行 -->
    <div class="toolbar">
      <a-space :size="12" wrap>
        <a-range-picker
          v-model:value="dateRange"
          value-format="YYYY-MM-DD"
          :placeholder="['创建开始日期', '结束日期']"
          @change="onFilterChange"
        />
        <a-select
          v-model:value="status"
          placeholder="发布状态"
          style="width: 130px"
          allow-clear
          :options="STATUS_OPTIONS"
          @change="onFilterChange"
        />
        <a-input
          v-model:value="keyword"
          placeholder="搜索标题/名称"
          style="width: 240px"
          allow-clear
          :maxlength="100"
          @press-enter="onFilterChange"
        />
        <SearchActions :loading="loading" @search="onFilterChange" @reset="onResetFilters" />
      </a-space>
    </div>
    <div class="actions">
      <!-- 跟随栏目名，就地改名后同步更新 -->
      <span class="actions-title">{{ channel.name }}数据</span>
      <a-space :size="12">
        <a-button type="primary" @click="goEdit()">
          <template #icon><PlusOutlined /></template>
          新增
        </a-button>
        <a-popconfirm
          :title="`确定删除选中的 ${selectedKeys.length} 条吗？删除后移入回收站，30 天内可恢复`"
          ok-type="danger"
          ok-text="确定"
          cancel-text="取消"
          :disabled="!selectedKeys.length"
          @confirm="onBatchDelete"
        >
          <a-button :disabled="!selectedKeys.length">批量删除</a-button>
        </a-popconfirm>
        <!-- 批量发布 / 下线：改版、换季时一次处理一批 -->
        <a-dropdown :disabled="!selectedKeys.length || batchBusy">
          <a-button :loading="batchBusy">
            批量发布/下线 <DownOutlined />
          </a-button>
          <template #overlay>
            <a-menu @click="({ key }: { key: string }) => onBatchStatus(key as ContentStatus)">
              <a-menu-item key="published">发布到官网</a-menu-item>
              <a-menu-item key="draft">下线为草稿</a-menu-item>
            </a-menu>
          </template>
        </a-dropdown>
        <PreviewPageButton v-if="previewable" :channel-key="channel.key" />
        <a-button @click="trashOpen = true">
          <template #icon><DeleteOutlined /></template>
          回收站
        </a-button>
      </a-space>
    </div>
    <TrashDrawer v-model:open="trashOpen" :channel-key="channel.key" @restored="fetchList" />

    <!-- 列表 -->
    <a-table
      :columns="columns"
      :data-source="rows"
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
            <a class="name-text name-link" role="button" tabindex="0" @click="goEdit(record.id)" @keydown.enter="goEdit(record.id)">{{ record.title || record.name || '-' }}</a>
            <a-tooltip :title="SORT_TIP">
              <ControlOutlined class="sort-drag-handle" />
            </a-tooltip>
          </span>
        </template>
        <template v-else-if="column.key === 'name'">
          <span class="name-cell">
            <a class="name-text name-link" role="button" tabindex="0" @click="goEdit(record.id)" @keydown.enter="goEdit(record.id)">{{ record.name || record.title || '-' }}</a>
            <a-tooltip :title="SORT_TIP">
              <ControlOutlined class="sort-drag-handle" />
            </a-tooltip>
          </span>
        </template>
        <!-- 发布状态：草稿不在前台展示，需明确区分 -->
        <template v-else-if="column.key === 'status'">
          <a-tag :color="record.status === 'draft' ? 'orange' : 'green'">
            {{ record.status === 'draft' ? '草稿' : '已发布' }}
          </a-tag>
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
        <!-- 操作：文字按钮，不让运营去猜图标含义 -->
        <template v-else-if="column.key === 'ops'">
          <a-space :size="4">
            <a-button type="link" size="small" @click="goEdit(record.id)">编辑</a-button>
            <a-button type="link" size="small" :loading="duplicatingId === record.id" @click="onDuplicate(record.id)">复制</a-button>
            <a-popconfirm title="确定删除这条内容吗？删除后移入回收站，30 天内可恢复" ok-text="删除" ok-type="danger" cancel-text="取消" @confirm="onDelete(record.id)">
              <a-button type="link" size="small" danger>删除</a-button>
            </a-popconfirm>
          </a-space>
        </template>
      </template>
      <!-- 空状态：区分「加载失败」「筛选无结果」「还没有内容」，各给下一步 -->
      <template #emptyText>
        <a-result v-if="loadFailed" status="warning" title="列表加载失败" class="list-empty">
          <template #extra><a-button type="primary" @click="fetchList">重新加载</a-button></template>
        </a-result>
        <a-empty v-else-if="hasFilter" description="没有符合条件的内容" class="list-empty">
          <a-button @click="onResetFilters">重置筛选</a-button>
        </a-empty>
        <a-empty v-else :description="`还没有${channel.name}内容`" class="list-empty">
          <a-button type="primary" @click="goEdit()">新增第一条</a-button>
        </a-empty>
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
        :show-total="(t: number) => `共 ${t} 条`"
        show-less-items
        @change="fetchList"
        @show-size-change="onPageSizeChange"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
// 通用内容列表页：筛选 / 排序 / 置顶 / 修改 / 删除 / 全选 / 批量删除 / 新增
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { PlusOutlined, ArrowUpOutlined, ControlOutlined, DownOutlined, DeleteOutlined } from '@ant-design/icons-vue'
import {
  getContentList, deleteContent, toggleContentTop, duplicateContent, batchContentStatus,
  type Channel, type Content, type ContentStatus
} from '@/api/cms'
import { COLUMN_LABELS } from './fieldDefs'
import ChannelTitle from './components/ChannelTitle.vue'
import PreviewPageButton from './components/PreviewPageButton.vue'
import TrashDrawer from './components/TrashDrawer.vue'
import SearchActions from '@/components/SearchActions/index.vue'
import { useChannels } from '@/composables/useChannels'
import { useListQuery } from '@/composables/useListQuery'
import { useContentDragSort } from './composables/useContentDragSort'

/** 拖拽排序只在当前页内生效，提示里说清楚，免得运营以为跨页拖不动是故障 */
const SORT_TIP = '按住拖动调整顺序（只调整本页；要跨页调整，可把每页条数调大）'

/** 发布状态筛选项 */
const STATUS_OPTIONS = [
  { value: 'published', label: '已发布' },
  { value: 'draft', label: '草稿' }
]

const props = defineProps<{ channel: Channel }>()

// 只有官网页面上的栏目才有页面可预览（首页板块走聚合接口，不支持草稿预览）；后端同口径再校验一次
// 沿 parentId 上溯到顶级页面；ancestors 链首可能补了挂靠目标，那不是本栏目的页面，取最后一个顶级节点
const { ancestors } = useChannels()
const previewable = computed(() => {
  const page = ancestors(props.channel.key).filter(c => c.parentId === null).pop()
  return !!page?.portalPath && page.portalPath !== '/'
})
const router = useRouter()

// 页码与筛选从地址栏恢复：编辑完返回、刷新都停在原来那一页
const listQuery = useListQuery(() => props.channel.key)
const STATUS_VALUES: ContentStatus[] = ['published', 'draft']
const statusFromQuery = () => {
  const s = listQuery.strOf('status') as ContentStatus | undefined
  return s && STATUS_VALUES.includes(s) ? s : undefined
}

const loading = ref(false)
/** 最近一次加载是否失败：失败时表格显示「重新加载」而不是「暂无数据」 */
const loadFailed = ref(false)
const rows = ref<Content[]>([])
const keyword = ref(listQuery.strOf('keyword') ?? '')
const dateRange = ref<[string, string] | undefined>(listQuery.rangeOf('dateFrom', 'dateTo'))
const status = ref<ContentStatus | undefined>(statusFromQuery())
const selectedKeys = ref<number[]>([])
const tableWrap = ref<HTMLElement>()
/** 回收站抽屉 */
const trashOpen = ref(false)

// 分页（服务端分页，rows 即当前页数据）
const page = ref(listQuery.initialPage())
const pageSize = ref(listQuery.initialPageSize())
const total = ref(0)

/** 是否带了筛选条件：决定空状态文案是「新增第一条」还是「试试重置」 */
const hasFilter = computed(() => !!(keyword.value || dateRange.value || status.value))

// 动态列：按栏目 listColumns + 固定操作列（sort 不再单列，拖拽手柄并入标题/名称列）
const columns = computed(() => {
  // brand 列原是一个永远点不了的「品牌管理」占位按钮，功能未上线，不再展示
  const cols = props.channel.listColumns
    .filter((key) => key !== 'sort' && key !== 'brand')
    .map((key) => {
      if (key === 'index') return { title: '序号', key: 'index', width: 80, align: 'center' as const }
      if (key === 'isTop') return { title: '置顶', key: 'isTop', width: 80, align: 'center' as const }
      if (key === 'createTime') return { title: '创建日期', dataIndex: 'createTime', key: 'createTime', width: 180 }
      return { title: COLUMN_LABELS[key] || key, key, dataIndex: key }
    })
  // 状态列不进 listColumns 配置：每个栏目都需要区分草稿与已发布，无须逐栏目开关
  cols.push({ title: '状态', key: 'status', width: 90, align: 'center' as const })
  cols.push({ title: '操作', key: 'ops', width: 170, align: 'center' as const })
  return cols
})

const fetchList = async () => {
  loading.value = true
  loadFailed.value = false
  listQuery.sync({
    page: page.value,
    pageSize: pageSize.value,
    filters: { keyword: keyword.value || undefined, status: status.value, date: dateRange.value },
  })
  try {
    const res = await getContentList({
      channelKey: props.channel.key,
      keyword: keyword.value || undefined,
      startDate: dateRange.value?.[0],
      endDate: dateRange.value?.[1],
      status: status.value,
      page: page.value,
      pageSize: pageSize.value
    })
    if (res.data.code === 200) {
      rows.value = res.data.data.list
      total.value = res.data.data.total
      selectedKeys.value = []
      // 末页删空后当前页会越界，回退一页重取
      if (!rows.value.length && total.value && page.value > 1) {
        page.value -= 1
        await fetchList()
      }
    } else {
      loadFailed.value = true
      message.error(res.data.message || '获取列表失败')
    }
  } catch {
    loadFailed.value = true
    message.error('获取列表失败')
  } finally {
    loading.value = false
  }
}

// 筛选条件变化：回到首页再查，否则在第 3 页改条件会看到空列表
const onFilterChange = () => {
  page.value = 1
  fetchList()
}

// 重置：清空全部筛选条件后回到首页重查
const onResetFilters = () => {
  keyword.value = ''
  dateRange.value = undefined
  status.value = undefined
  onFilterChange()
}

// 每页条数变化：条数变了原页码可能越界，一并回到首页；记住选择，下次进来沿用
const onPageSizeChange = (_current: number, size: number) => {
  listQuery.rememberPageSize(size)
  page.value = 1
  fetchList()
}

const onSelectChange = (keys: (string | number)[]) => {
  selectedKeys.value = keys as number[]
}

// 跳转编辑/新增全页表单：带上当前列表地址，编辑页返回时回到同一页同一筛选
const goEdit = (id?: number) => {
  router.push({
    path: id ? `/cms/${props.channel.key}/edit/${id}` : `/cms/${props.channel.key}/edit`,
    query: { from: listQuery.currentFullPath() },
  })
}

const onToggleTop = async (record: Content) => {
  try {
    const res = await toggleContentTop(props.channel.key, record.id)
    if (res.data.code !== 200) {
      message.error(res.data.message || '操作失败')
      return
    }
    // 置顶影响排序（置顶优先），重取一次让行位置与前台一致
    message.success(record.isTop ? '已取消置顶' : '已置顶')
    fetchList()
  } catch {
    message.error('操作失败')
  }
}

// 拖拽排序：见 useContentDragSort
const { initSortable } = useContentDragSort({
  channelKey: () => props.channel.key,
  rows,
  tableWrap,
  reload: () => { fetchList() },
})

// 后端异常恒回 HTTP 200，须按业务码判断，否则被拒绝也会提示成功
const removeIds = async (ids: number[]) => {
  try {
    const res = await deleteContent(props.channel.key, ids)
    if (res.data.code !== 200) {
      message.error(res.data.message || '删除失败')
      return
    }
    // 后端提示「已移入回收站，N 天内可恢复」，原样展示
    message.success(res.data.message || '已移入回收站')
    fetchList()
  } catch {
    message.error('删除失败，请稍后重试')
  }
}

const onDelete = (id: number) => removeIds([id])
const onBatchDelete = () => removeIds(selectedKeys.value)

/** 复制为草稿：成功后直接打开副本编辑，运营照着改即可 */
const duplicatingId = ref<number | null>(null)
const onDuplicate = async (id: number) => {
  if (duplicatingId.value) return
  duplicatingId.value = id
  try {
    const res = await duplicateContent(props.channel.key, id)
    if (res.data.code !== 200 || !res.data.data?.id) {
      message.error(res.data.message || '复制失败')
      return
    }
    message.success('已复制为草稿，正在打开副本')
    goEdit(res.data.data.id)
  } catch {
    message.error('复制失败，请稍后重试')
  } finally {
    duplicatingId.value = null
  }
}

/** 批量发布 / 下线 */
const batchBusy = ref(false)
const onBatchStatus = async (target: ContentStatus) => {
  if (!selectedKeys.value.length || batchBusy.value) return
  batchBusy.value = true
  try {
    const res = await batchContentStatus(props.channel.key, selectedKeys.value, target)
    if (res.data.code !== 200) {
      message.error(res.data.message || '操作失败')
      return
    }
    message.success(res.data.message || '操作成功')
    fetchList()
  } catch {
    message.error('操作失败，请稍后重试')
  } finally {
    batchBusy.value = false
  }
}

onMounted(fetchList)
// 切换栏目时重置并重新加载（CmsView 按栏目 key 重建本组件，这里是兜底）
watch(() => props.channel.key, () => {
  keyword.value = ''
  dateRange.value = undefined
  status.value = undefined
  page.value = 1
  pageSize.value = listQuery.initialPageSize()
  fetchList()
})
// 行集合变化（翻页/页容量/重载）后重建拖拽实例；纯排序拖动不触发，避免打断动画
watch(
  () => [props.channel.key, page.value, pageSize.value, rows.value.length].join('|'),
  () => { initSortable() }
)
</script>

<style scoped>
.content-list {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
}

/* 查询条件独立成浅灰区块；下方 .actions 为功能操作行，靠右，与查询区分开 */
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

/* 标题即编辑入口：悬停变色提示可点 */
.name-link {
  color: #262626;
  cursor: pointer;
}

.name-link:hover {
  color: #2f7cff;
}

.list-empty {
  padding: 24px 0;
}

.footer-bar {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  margin-top: 16px;
}
</style>
