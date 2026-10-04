<template>
  <a-modal
    :open="open"
    :title="title"
    :footer="null"
    width="880px"
    @update:open="emit('update:open', $event)"
  >
    <div class="picker-toolbar">
      <a-space :size="12" wrap>
        <a-input-search
          v-model:value="keyword"
          placeholder="按文件名搜索"
          style="width: 220px"
          allow-clear
          :maxlength="100"
          @search="search"
        />
        <a-select
          v-model:value="sort"
          style="width: 150px"
          :options="[...SORT_OPTIONS]"
          @change="search"
        />
        <span class="tip">点击任一素材即选用</span>
      </a-space>
    </div>

    <MediaGrid
      :items="rows"
      :loading="loading"
      selectable
      :empty-text="emptyText"
      @pick="onPick"
    />

    <div v-if="total > 0" class="picker-pager">
      <a-pagination
        :current="page"
        :page-size="pageSize"
        :total="total"
        size="small"
        :show-total="(count: number) => `共 ${count} 个`"
        @change="onPageChange"
      />
    </div>
  </a-modal>
</template>

<script setup lang="ts">
// 素材选择器：从已上传的素材里挑一个填回表单，避免同一张图反复上传
import { computed, ref, watch } from 'vue'
import { getMediaList, type MediaItem } from '@/api/media'
import { useServerListPage } from '@/composables/useServerListPage'
import MediaGrid from './MediaGrid.vue'
import { SORT_OPTIONS } from '../format'

const props = withDefaults(
  defineProps<{
    open: boolean
    /** 限定可选类型，内容表单的图片字段只应选到图片 */
    type?: MediaItem['type']
    title?: string
  }>(),
  { type: 'image', title: '选择已有素材' }
)

const emit = defineEmits<{
  'update:open': [value: boolean]
  pick: [url: string]
}>()

const keyword = ref('')
const sort = ref<(typeof SORT_OPTIONS)[number]['value']>('mtime-desc')

// immediate: false —— 弹窗未打开时不该发请求，扫全库引用有成本
const { loading, rows, page, pageSize, total, fetchList, search, onPageChange } =
  useServerListPage<MediaItem>(
    (query) => {
      const [sortBy, sortOrder] = sort.value.split('-') as ['mtime' | 'size', 'asc' | 'desc']
      return getMediaList({
        type: props.type,
        keyword: keyword.value || undefined,
        sortBy,
        sortOrder,
        page: query.page,
        pageSize: query.pageSize
      })
    },
    { immediate: false, pageSize: 12 }
  )

const emptyText = computed(() =>
  keyword.value ? '没有符合条件的素材' : '暂无可选素材，请先上传'
)

// 每次打开都重新取数：期间可能有人传了新图或删了旧图
watch(
  () => props.open,
  (opened) => {
    if (opened) search()
  }
)

/** 选中即回填并关闭，不再要求点一次确定 */
const onPick = (item: MediaItem) => {
  emit('pick', item.url)
  emit('update:open', false)
}

// fetchList 由 search 内部调用，此处导出供父组件必要时手动刷新
defineExpose({ refresh: fetchList })
</script>

<style scoped>
.picker-toolbar {
  margin-bottom: 12px;
}

.tip {
  color: #8c8c8c;
  font-size: 12px;
}

.picker-pager {
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
}
</style>
