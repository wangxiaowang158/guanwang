<template>
  <!-- 预览按钮：在新窗口打开该栏目所在的官网页面，含本栏目及同页其他栏目的草稿；栏目不在官网页面上时不显示 -->
  <a-tooltip title="在新窗口打开官网页面，草稿也会显示；链接 30 分钟内有效">
    <a-button :loading="loading" @click="open">
      <template #icon><EyeOutlined /></template>
      预览页面
    </a-button>
  </a-tooltip>
</template>

<script setup lang="ts">
// 令牌由后端签发（绑定页面、30 分钟过期），这里只负责拼地址、开窗口
import { ref } from 'vue'
import { message } from 'ant-design-vue'
import { EyeOutlined } from '@ant-design/icons-vue'
import { getPreviewLink } from '@/api/cms'
import { PORTAL_ORIGIN } from '@/config'

const props = defineProps<{ channelKey: string }>()

const loading = ref(false)

const open = async () => {
  // 先同步开一个空窗口：等接口返回再 window.open 会被浏览器当成弹窗拦掉
  const win = window.open('about:blank', '_blank')
  loading.value = true
  try {
    const res = await getPreviewLink(props.channelKey)
    const link = res.data.code === 200 ? res.data.data : null
    const origin = PORTAL_ORIGIN || link?.origin || ''
    if (!link || !origin) {
      win?.close()
      message.error(link ? '请先在「基本信息 → 搜索引擎」里填写网站域名，才能打开官网预览' : res.data.message || '获取预览链接失败')
      return
    }
    const url = new URL(link.path, origin)
    url.searchParams.set('preview', link.token)
    if (link.anchor) url.hash = link.anchor
    if (win) {
      // 切断新窗口对后台页面的引用，等价于 noopener
      win.opener = null
      win.location.href = url.toString()
    } else {
      window.open(url.toString(), '_blank', 'noopener')
    }
  } catch {
    win?.close()
    message.error('获取预览链接失败，请稍后重试')
  } finally {
    loading.value = false
  }
}
</script>
