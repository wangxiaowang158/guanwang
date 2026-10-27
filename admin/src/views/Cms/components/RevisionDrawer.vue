<template>
  <!-- 历史版本：每次保存前的旧值快照，可预览并恢复；每条内容保留最近 20 版 -->
  <a-drawer :open="open" title="历史版本" width="860" @close="emit('update:open', false)">
    <div class="layout">
      <div class="list">
        <a-spin :spinning="loading">
          <a-empty v-if="!loading && !rows.length" description="还没有历史版本，保存修改后会自动记录" />
          <ul v-else class="rev-list">
            <li
              v-for="r in rows"
              :key="r.id"
              :class="['rev-item', { active: r.id === currentId }]"
              role="button"
              tabindex="0"
              @click="onPreview(r.id)"
              @keydown.enter="onPreview(r.id)"
            >
              <div class="rev-time">{{ r.createdAt }}</div>
              <div class="rev-meta">{{ r.operator || '系统' }} · {{ r.title || '（无标题）' }}</div>
            </li>
          </ul>
        </a-spin>
        <div class="field-tip">每条内容保留最近 20 个版本；恢复前的当前内容也会记成一个新版本</div>
      </div>

      <div class="preview">
        <a-spin :spinning="previewLoading">
          <a-empty v-if="!snapshot" description="点击左侧版本查看内容" />
          <template v-else>
            <div class="preview-head">
              <div class="preview-title">{{ snapshot.title || snapshot.name || '（无标题）' }}</div>
              <a-popconfirm
                title="确定恢复到此版本吗？当前内容会先记为一个新版本"
                ok-text="恢复"
                cancel-text="取消"
                @confirm="onRestore"
              >
                <a-button type="primary" :loading="restoring">恢复到此版本</a-button>
              </a-popconfirm>
            </div>
            <a-descriptions :column="1" size="small" bordered class="facts">
              <a-descriptions-item label="状态">{{ snapshot.status === 'draft' ? '草稿' : '已发布' }}</a-descriptions-item>
              <a-descriptions-item v-if="snapshot.publishAt" label="发布时间">{{ formatTime(snapshot.publishAt) }}</a-descriptions-item>
              <a-descriptions-item v-if="snapshot.subtitle" label="副标题">{{ snapshot.subtitle }}</a-descriptions-item>
              <a-descriptions-item v-if="snapshot.description" label="描述">{{ snapshot.description }}</a-descriptions-item>
              <a-descriptions-item v-if="snapshot.cover" label="封面">
                <img :src="String(snapshot.cover)" alt="封面" class="cover" />
              </a-descriptions-item>
            </a-descriptions>
            <!-- 快照正文入库前已净化，展示前仍过一道前端净化 -->
            <!-- eslint-disable-next-line vue/no-v-html -->
            <div v-if="html" class="rich" v-html="html"></div>
          </template>
        </a-spin>
      </div>
    </div>
  </a-drawer>
</template>

<script setup lang="ts">
// 内容历史版本抽屉：列表 + 快照预览 + 恢复
import { computed, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import {
  getRevision, getRevisions, restoreRevision, type ContentRevision, type RevisionSnapshot,
} from '@/api/cms'
import { sanitizeHtml } from '@/utils/sanitize'

const props = defineProps<{ open: boolean; channelKey: string; contentId: number }>()
/** restored：已恢复，父级据此重新载入表单 */
const emit = defineEmits<{ 'update:open': [boolean]; restored: [] }>()

const loading = ref(false)
const rows = ref<ContentRevision[]>([])
const currentId = ref<number | null>(null)
const snapshot = ref<RevisionSnapshot | null>(null)
const previewLoading = ref(false)
const restoring = ref(false)

const html = computed(() => {
  const raw = snapshot.value?.content
  return typeof raw === 'string' && raw ? sanitizeHtml(raw) : ''
})

/** 快照里的 publishAt 是 ISO 串，按本地时间显示 */
const formatTime = (v: unknown) => {
  const d = new Date(String(v))
  return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleString('zh-CN', { hour12: false })
}

const fetchList = async () => {
  loading.value = true
  try {
    const res = await getRevisions(props.channelKey, props.contentId)
    if (res.data.code !== 200) {
      message.error(res.data.message || '历史版本加载失败')
      return
    }
    rows.value = res.data.data ?? []
  } catch {
    message.error('历史版本加载失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

const onPreview = async (id: number) => {
  currentId.value = id
  previewLoading.value = true
  try {
    const res = await getRevision(props.channelKey, id)
    if (res.data.code !== 200 || !res.data.data) {
      message.error(res.data.message || '版本内容加载失败')
      return
    }
    // 连续点击时只认最后一次
    if (currentId.value === id) snapshot.value = res.data.data
  } catch {
    message.error('版本内容加载失败，请稍后重试')
  } finally {
    previewLoading.value = false
  }
}

const onRestore = async () => {
  if (!currentId.value || restoring.value) return
  restoring.value = true
  try {
    const res = await restoreRevision(props.channelKey, currentId.value)
    if (res.data.code !== 200) {
      message.error(res.data.message || '恢复失败')
      return
    }
    message.success(res.data.message || '已恢复到该版本')
    emit('restored')
    emit('update:open', false)
  } catch {
    message.error('恢复失败，请稍后重试')
  } finally {
    restoring.value = false
  }
}

watch(() => props.open, (opened) => {
  if (!opened) return
  currentId.value = null
  snapshot.value = null
  fetchList()
})
</script>

<style scoped>
.layout { display: flex; gap: 16px; min-height: 400px; }
.list { flex: 0 0 260px; }
.preview { flex: 1; min-width: 0; }
.rev-list { list-style: none; margin: 0; padding: 0; }
.rev-item { padding: 10px 12px; border: 1px solid #f0f0f0; border-radius: 6px; margin-bottom: 8px; cursor: pointer; }
.rev-item:hover, .rev-item:focus-visible { border-color: #91caff; outline: none; }
.rev-item.active { border-color: #1677ff; background: #e6f4ff; }
.rev-time { font-size: 13px; color: #262626; }
.rev-meta { margin-top: 2px; font-size: 12px; color: #8c8c8c; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.field-tip { margin-top: 8px; font-size: 12px; color: #8c8c8c; }
.preview-head { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 12px; }
.preview-title { font-size: 16px; font-weight: 600; color: #262626; }
.facts { margin-bottom: 12px; }
.cover { max-width: 240px; max-height: 150px; object-fit: contain; }
.rich { padding: 12px; border: 1px solid #f0f0f0; border-radius: 6px; line-height: 1.7; overflow-wrap: anywhere; }
.rich :deep(img) { max-width: 100%; }
</style>
