<template>
  <div class="media-library">
    <div class="page-title">素材库</div>

    <!-- 容量概览：先让运营知道盘里有多少、能清多少，再决定要不要清 -->
    <div class="stat-bar">
      <a-space :size="24" wrap>
        <span>共 {{ stat.total }} 个素材，占用 {{ formatSize(stat.totalSize) }}</span>
        <span>图片 {{ stat.image }} · 视频 {{ stat.video }} · 其他 {{ stat.other }}</span>
        <span class="unused">
          未引用 {{ stat.unused }} 个，可释放 {{ formatSize(stat.unusedSize) }}
        </span>
      </a-space>
    </div>

    <div class="toolbar">
      <a-space :size="12" wrap>
        <a-radio-group
          v-model:value="type"
          :options="[...TYPE_OPTIONS]"
          option-type="button"
          button-style="solid"
          @change="search"
        />
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
          style="width: 160px"
          :options="[...SORT_OPTIONS]"
          @change="search"
        />
        <a-checkbox v-model:checked="unusedOnly" @change="search">只看未引用</a-checkbox>
        <a-button :loading="loading" @click="fetchList">刷新</a-button>
      </a-space>
    </div>

    <a-alert
      type="info"
      show-icon
      message="「使用中」的素材不可删除；24 小时内上传的文件标记为「新上传」，可能正被编辑中的内容引用"
      class="hint"
    />

    <MediaGrid
      :items="rows"
      :loading="loading"
      :empty-text="emptyText"
      @remove="onRemove"
      @preview="onPreview"
    />

    <div v-if="total > 0" class="pager">
      <a-pagination
        :current="page"
        :page-size="pageSize"
        :total="total"
        :page-size-options="['12', '24', '48', '96']"
        show-size-changer
        :show-total="(count: number) => `共 ${count} 个`"
        @change="onPageChange"
      />
    </div>

    <a-modal v-model:open="previewOpen" :title="previewItem?.name" :footer="null" width="720px">
      <img
        v-if="previewItem?.type === 'image'"
        :src="previewItem.url"
        :alt="previewItem.name"
        class="preview-media"
      />
      <video
        v-else-if="previewItem?.type === 'video'"
        :src="previewItem.url"
        controls
        class="preview-media"
      />
      <a-empty v-else description="该类型素材不支持在线预览，可复制地址后在新窗口打开" />
    </a-modal>
  </div>
</template>

<script setup lang="ts">
// 素材库：浏览上传目录已有文件，删除无人引用的素材释放磁盘
// 数据源是磁盘而非数据库，故列表项没有 id，一律以站内地址为标识
import { computed, ref } from 'vue'
import { message } from 'ant-design-vue'
import { deleteMedia, getMediaList, type MediaItem, type MediaStat } from '@/api/media'
import { useServerListPage } from '@/composables/useServerListPage'
import { DELETE_FAILED, DELETE_SUCCESS } from '@/constants/ui'
import MediaGrid from './components/MediaGrid.vue'
import { formatSize, SORT_OPTIONS, TYPE_OPTIONS } from './format'

defineOptions({ name: 'MediaLibraryPage' })

/** 空统计，首次加载完成前占位，避免模板取 undefined */
const EMPTY_STAT: MediaStat = {
  total: 0,
  image: 0,
  video: 0,
  other: 0,
  unused: 0,
  totalSize: 0,
  unusedSize: 0
}

const type = ref<'all' | MediaItem['type']>('all')
const keyword = ref('')
const unusedOnly = ref(false)
// 排序字段与方向合成一个下拉值，避免摆两个控件让运营在「按什么排」与「正反序」间来回切
const sort = ref<(typeof SORT_OPTIONS)[number]['value']>('mtime-desc')

const stat = ref<MediaStat>(EMPTY_STAT)
const previewOpen = ref(false)
const previewItem = ref<MediaItem>()

const { loading, rows, page, pageSize, total, fetchList, search, onPageChange, refreshAfterRemove } =
  useServerListPage<MediaItem>(
    async (query) => {
      const [sortBy, sortOrder] = sort.value.split('-') as ['mtime' | 'size', 'asc' | 'desc']
      const res = await getMediaList({
        type: type.value,
        keyword: keyword.value || undefined,
        unusedOnly: unusedOnly.value || undefined,
        sortBy,
        sortOrder,
        page: query.page,
        pageSize: query.pageSize
      })
      // 统计随列表一并返回，取的是全量而非当前筛选结果
      if (res.data.code === 200) stat.value = res.data.data.stat
      return res
    },
    { pageSize: 24 }
  )

/** 空状态文案随筛选条件变化，避免「有素材但筛不出」被误读为素材全丢了 */
const emptyText = computed(() => {
  if (unusedOnly.value) return '没有未引用的素材，磁盘上的文件都在使用中'
  if (keyword.value || type.value !== 'all') return '没有符合条件的素材'
  return '暂无素材，可在内容编辑页上传图片或视频'
})

/** 打开预览 */
const onPreview = (item: MediaItem) => {
  previewItem.value = item
  previewOpen.value = true
}

/**
 * 删除素材
 * 引用状态由后端在删除时重新核对，前端不提前拦——列表里的状态可能已过期
 */
const onRemove = async (item: MediaItem) => {
  try {
    const res = await deleteMedia(item.url)
    if (res.data.code !== 200) {
      message.error(res.data.message || DELETE_FAILED)
      return
    }
    message.success(DELETE_SUCCESS)
    await refreshAfterRemove(1)
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

.stat-bar {
  margin-bottom: 12px;
  padding: 10px 14px;
  background: #fafafa;
  border-radius: 6px;
  color: #595959;
  font-size: 13px;
}

.unused {
  color: #d46b08;
}

.toolbar {
  margin-bottom: 12px;
}

.hint {
  margin-bottom: 16px;
}

.pager {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

.preview-media {
  width: 100%;
  display: block;
}
</style>
