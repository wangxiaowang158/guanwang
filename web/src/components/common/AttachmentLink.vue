<template>
  <!-- 附件下载：站内文件用 download 属性带上可读的文件名（落盘名是随机串）；外链新窗口打开 -->
  <a
    :href="safeHref"
    class="attach"
    :class="{ 'attach--dark': onDark }"
    :download="isLocal ? downloadName : undefined"
    :target="isLocal ? undefined : '_blank'"
    :rel="isLocal ? undefined : 'noopener noreferrer'"
  >
    <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 4v11m0 0l-4-4m4 4l4-4M5 19h14" />
    </svg>
    <span>{{ label }}</span>
    <span v-if="file.ext" class="attach-ext">{{ file.ext }}</span>
  </a>
</template>

<script setup lang="ts">
// 附件下载链接，文章详情页与卡片共用
import { computed } from 'vue'
import type { Attachment } from '@/api/page'

const props = withDefaults(defineProps<{
  file: Attachment
  /** 下载时的文件名（不含扩展名），通常取内容标题 */
  name?: string
  label?: string
  onDark?: boolean
}>(), { name: '', label: '下载资料', onDark: false })

const isLocal = computed(() => props.file.url.startsWith('/uploads/'))

/** 协议白名单：只放站内上传与 http(s) 外链，挡掉 javascript: 等可执行协议 */
const safeHref = computed(() => (isLocal.value || /^https?:\/\//i.test(props.file.url) ? props.file.url : undefined))

/** 去掉文件名里各系统不允许的字符 */
const downloadName = computed(() => {
  const base = props.name.replace(/[\\/:*?"<>|]/g, ' ').trim().slice(0, 80) || 'download'
  return props.file.ext ? `${base}.${props.file.ext.toLowerCase()}` : base
})
</script>

<style scoped>
.attach {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  font-size: 14px;
  color: var(--color-brand-700);
  background: var(--color-brand-50);
  border-radius: var(--radius-md);
  transition: background-color var(--dur-fast) ease;
}
.attach:hover {
  background: color-mix(in srgb, var(--color-brand-600) 14%, #fff);
}
.attach--dark {
  color: #fff;
  background: rgb(255 255 255 / 0.12);
}
.attach--dark:hover {
  background: rgb(255 255 255 / 0.2);
}
.attach-ext {
  padding: 0 6px;
  font-size: 11px;
  font-weight: 600;
  line-height: 18px;
  border: 1px solid currentColor;
  border-radius: var(--radius-sm);
  opacity: 0.75;
}
</style>
