<template>
  <a-spin :spinning="loading">
    <a-empty v-if="!loading && !items.length" :description="emptyText" class="empty" />
    <ul v-else class="grid">
      <li
        v-for="item in items"
        :key="item.url"
        class="cell"
        :class="{ 'cell--pickable': selectable }"
        @click="selectable && emit('pick', item)"
      >
        <!-- 预览区：图片直出缩略，视频与其他类型用占位符，避免为列表加载大文件 -->
        <div class="thumb">
          <img
            v-if="item.type === 'image'"
            :src="item.url"
            :alt="item.name"
            width="160"
            height="120"
            loading="lazy"
            class="thumb-img"
          />
          <div v-else class="thumb-icon">
            <PlayCircleOutlined v-if="item.type === 'video'" />
            <FileOutlined v-else />
            <span class="thumb-ext">{{ item.ext || '未知格式' }}</span>
          </div>
          <a-tag v-if="item.referenced" color="blue" class="badge">使用中</a-tag>
          <a-tag v-else-if="item.recent" color="orange" class="badge">新上传</a-tag>
          <a-tag v-else color="default" class="badge">未引用</a-tag>
        </div>

        <div class="meta">
          <div class="name" :title="item.name">{{ item.name }}</div>
          <div class="sub">
            {{ formatSize(item.size) }}
            <span v-if="item.bucket" class="bucket">· {{ item.bucket }}</span>
          </div>
          <div class="sub">{{ formatTime(item.mtime) }}</div>
        </div>

        <!-- 操作区：选择模式下不显示，避免在挑素材时误删 -->
        <div v-if="!selectable" class="actions" @click.stop>
          <a-button type="link" size="small" @click="onCopy(item)">复制地址</a-button>
          <a-button type="link" size="small" @click="emit('preview', item)">预览</a-button>
          <a-tooltip v-if="item.referenced" title="该素材仍被引用，需先解除引用">
            <a-button type="link" size="small" disabled>删除</a-button>
          </a-tooltip>
          <a-popconfirm
            v-else
            title="删除后不可恢复，确认删除该素材？"
            ok-text="确认删除"
            cancel-text="取消"
            :ok-button-props="{ danger: true }"
            @confirm="emit('remove', item)"
          >
            <a-button type="link" size="small" danger>删除</a-button>
          </a-popconfirm>
        </div>
      </li>
    </ul>
  </a-spin>
</template>

<script setup lang="ts">
// 素材网格：管理页与选择器弹窗共用的展示组件，自身不取数不删数据
import { message } from 'ant-design-vue'
import { FileOutlined, PlayCircleOutlined } from '@ant-design/icons-vue'
import type { MediaItem } from '@/api/media'
import { formatSize, formatTime } from '../format'

withDefaults(
  defineProps<{
    items: MediaItem[]
    loading?: boolean
    /** 选择模式：整格可点选，且隐藏删除等管理操作 */
    selectable?: boolean
    emptyText?: string
  }>(),
  { loading: false, selectable: false, emptyText: '暂无素材' }
)

const emit = defineEmits<{
  pick: [item: MediaItem]
  remove: [item: MediaItem]
  preview: [item: MediaItem]
}>()

/**
 * 复制素材地址到剪贴板
 * clipboard API 在非 HTTPS 或未授权时会失败，回落为把地址提示出来让用户手动复制
 */
const onCopy = async (item: MediaItem) => {
  try {
    await navigator.clipboard.writeText(item.url)
    message.success('地址已复制')
  } catch {
    message.warning(`复制失败，请手动复制：${item.url}`)
  }
}
</script>

<style scoped>
.grid {
  /* 自适应列数：容器窄时自动减列，不写死断点 */
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 16px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.cell {
  display: flex;
  flex-direction: column;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  overflow: hidden;
  background: #fff;
}

.cell--pickable {
  cursor: pointer;
  /* 只过渡合成器友好的属性 */
  transition: box-shadow 0.2s;
}

.cell--pickable:hover {
  box-shadow: 0 2px 8px rgb(0 0 0 / 12%);
}

.thumb {
  position: relative;
  height: 120px;
  background: #fafafa;
  display: flex;
  align-items: center;
  justify-content: center;
}

.thumb-img {
  width: 100%;
  height: 100%;
  /* contain 而非 cover：素材库要看清整张图的构图，裁掉边缘会误判 */
  object-fit: contain;
}

.thumb-icon {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  color: #8c8c8c;
  font-size: 28px;
}

.thumb-ext {
  font-size: 12px;
}

.badge {
  position: absolute;
  top: 6px;
  left: 6px;
  margin: 0;
}

.meta {
  padding: 8px 10px;
  flex: 1;
}

.name {
  font-size: 13px;
  /* 文件名较长，超出省略而非折行，保持每格等高 */
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sub {
  margin-top: 2px;
  color: #8c8c8c;
  font-size: 12px;
}

.bucket {
  margin-left: 2px;
}

.actions {
  display: flex;
  align-items: center;
  border-top: 1px solid #f5f5f5;
  padding: 2px 4px;
}

.empty {
  padding: 48px 0;
}
</style>
