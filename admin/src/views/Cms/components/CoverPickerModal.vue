<template>
  <a-modal
    :open="open"
    :title="title"
    width="880px"
    :mask-closable="false"
    :keyboard="!saving"
    :closable="!saving"
    :cancel-button-props="{ disabled: saving }"
    :confirm-loading="saving"
    ok-text="应用"
    cancel-text="取消"
    :ok-button-props="{ disabled: !canApply }"
    @ok="onApply"
    @cancel="close"
  >
    <a-tabs v-model:activeKey="tab">
      <!-- 素材库：复用素材网格，点击即选中 -->
      <a-tab-pane key="library" tab="素材库">
        <a-input-search
          v-model:value="keyword"
          class="lib-search"
          placeholder="按文件名搜索"
          allow-clear
          :maxlength="100"
          @search="search"
        />
        <MediaGrid
          :items="rows"
          :loading="loading"
          selectable
          empty-text="暂无可选素材，请先上传"
          @pick="(item) => selectUrl(item.url)"
        />
        <div v-if="total > 0" class="lib-pager">
          <a-pagination
            :current="page"
            :page-size="pageSize"
            :total="total"
            size="small"
            :show-total="(count: number) => `共 ${count} 个`"
            @change="onPageChange"
          />
        </div>
      </a-tab-pane>

      <!-- 本地上传：校验与上传由 composable 统一处理 -->
      <a-tab-pane key="upload" tab="本地上传">
        <a-button :loading="uploading" @click="fileRef?.click()">
          {{ uploading ? '上传中…' : '选择本地图片' }}
        </a-button>
        <span class="upload-tip">支持 {{ UPLOAD_IMAGE_LABEL }}，大小不超过 {{ UPLOAD_MAX_MB }}MB</span>
        <input
          ref="fileRef"
          type="file"
          :accept="UPLOAD_ACCEPT"
          class="file-hidden"
          @change="onFileChange"
        />
      </a-tab-pane>

      <!-- AI 生成：候选只在点「应用」时才落盘 -->
      <a-tab-pane key="ai" tab="AI 生成">
        <!-- v-if="open"：每次打开都重新挂载，清掉上一批候选并重新查询是否已配置密钥 -->
        <CoverAiPanel v-if="open" :selected-id="picked?.kind === 'ai' ? picked.id : undefined" @pick="selectAi" />
      </a-tab-pane>
    </a-tabs>

    <div class="picked">
      <span>已选：</span>
      <img v-if="pickedSrc" :src="pickedSrc" alt="已选封面" width="96" height="64" class="picked-img" />
      <span v-else class="picked-empty">未选择</span>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
// 封面图选择弹窗：素材库 / 本地上传 / AI 生成三种来源，点「应用」后才把地址写回表单
import { computed, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { getMediaList, type MediaItem } from '@/api/media'
import { saveAiImage, type AiImageCandidate } from '@/api/upload'
import { UPLOAD_ACCEPT, UPLOAD_IMAGE_LABEL, UPLOAD_MAX_MB } from '@/config'
import { useImageUpload } from '@/composables/useImageUpload'
import { useServerListPage } from '@/composables/useServerListPage'
import MediaGrid from '@/views/Media/components/MediaGrid.vue'
import CoverAiPanel from './CoverAiPanel.vue'

const props = withDefaults(defineProps<{ open: boolean; title?: string }>(), {
  title: '选择封面图片'
})
const emit = defineEmits<{
  'update:open': [value: boolean]
  confirm: [url: string]
}>()

/** 当前选中项：素材库/上传的是站内地址，AI 候选尚未落盘只有 id */
type Picked =
  | { kind: 'url'; url: string }
  | { kind: 'ai'; id: string; previewUrl: string }

const tab = ref('library')
const picked = ref<Picked | null>(null)
const saving = ref(false)
const fileRef = ref<HTMLInputElement>()

const keyword = ref('')
// immediate: false —— 弹窗未打开时不发请求，扫全库引用有成本
const { loading, rows, page, pageSize, total, search, onPageChange } =
  useServerListPage<MediaItem>(
    (query) =>
      getMediaList({
        type: 'image',
        keyword: keyword.value || undefined,
        sortBy: 'mtime',
        sortOrder: 'desc',
        page: query.page,
        pageSize: query.pageSize
      }),
    { immediate: false, pageSize: 8 }
  )

const { uploading, pickAndUpload } = useImageUpload()

const pickedSrc = computed(() => {
  if (!picked.value) return ''
  return picked.value.kind === 'url' ? picked.value.url : picked.value.previewUrl
})
const canApply = computed(() => !!picked.value && !uploading.value)

// 每次打开都重置选择并重新取素材：期间可能有人传了新图
watch(
  () => props.open,
  (opened) => {
    if (!opened) return
    picked.value = null
    tab.value = 'library'
    keyword.value = ''
    search()
  }
)

const selectUrl = (url: string) => {
  picked.value = { kind: 'url', url }
}

const selectAi = (item: AiImageCandidate) => {
  picked.value = { kind: 'ai', id: item.id, previewUrl: item.previewUrl }
}

// 上传成功后直接选中，用户再点「应用」确认
const onFileChange = async (e: Event) => {
  const url = await pickAndUpload(e.target as HTMLInputElement)
  if (url) selectUrl(url)
}

// 保存中不允许关闭：否则请求返回后会在用户取消之后静默写入封面
const close = () => {
  if (saving.value) return
  emit('update:open', false)
}

/** 应用：AI 候选先落盘取站内地址，其余直接回填 */
const onApply = async () => {
  const current = picked.value
  if (!current || saving.value) return
  if (current.kind === 'url') {
    emit('confirm', current.url)
    close()
    return
  }
  saving.value = true
  try {
    const res = await saveAiImage(current.id)
    const url = res.data.data?.url
    if (res.data.code !== 200 || !url) {
      message.error(res.data.message || '保存失败，请重新生成')
      return
    }
    emit('confirm', url)
    close()
  } catch {
    message.error('保存失败，请稍后重试')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.lib-search {
  width: 240px;
  margin-bottom: 12px;
}

.lib-pager {
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
}

.upload-tip {
  margin-left: 12px;
  color: #8c8c8c;
  font-size: 12px;
}

.file-hidden {
  display: none;
}

.picked {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}

.picked-img {
  object-fit: cover;
  border-radius: 4px;
  border: 1px solid #f0f0f0;
}

.picked-empty {
  color: #bfbfbf;
}
</style>
