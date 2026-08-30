<template>
  <!-- 我的反馈：按时间倒序列出反馈与管理员回复 -->
  <div class="mf">
    <el-alert v-if="errorText" type="error" :closable="false" show-icon class="mf-alert">
      {{ errorText }}
    </el-alert>

    <div v-if="loading" class="mf-loading">
      <el-skeleton :rows="3" animated />
    </div>

    <el-empty v-else-if="!list.length" description="还没有提交过反馈" />

    <ul v-else class="mf-list">
      <li v-for="item in list" :key="item.id" class="mf-item">
        <div class="mf-head">
          <span class="mf-type">{{ typeLabel(item.feedbackType) }}</span>
          <el-tag :type="statusTagType(item.status)" size="small" effect="light">
            {{ FEEDBACK_STATUS_LABEL[item.status] }}
          </el-tag>
          <time class="mf-time">{{ formatTime(item.createdAt) }}</time>
        </div>

        <p class="mf-content">{{ item.content }}</p>

        <!-- 回复线程：只包含管理员标记为对会员可见的回复 -->
        <div v-if="item.replies.length" class="mf-replies">
          <div v-for="reply in item.replies" :key="reply.id" class="mf-reply">
            <div class="mf-reply-head">
              <span class="mf-reply-by">{{ reply.repliedBy || '客服' }}</span>
              <time>{{ formatTime(reply.createdAt) }}</time>
            </div>
            <p class="mf-reply-body">{{ reply.content }}</p>
          </div>
        </div>
        <p v-else class="mf-pending">暂无回复，我们会尽快处理</p>
      </li>
    </ul>
  </div>
</template>
<script setup lang="ts">
// 我的反馈列表：拉取当前会员的反馈及可见回复
import { onMounted, ref } from 'vue'
import {
  fetchMyFeedback, FEEDBACK_STATUS_LABEL, FEEDBACK_TYPE_LABEL,
  type FeedbackStatus, type FeedbackType, type MyFeedbackItem,
} from '@/api/feedback'
import { REAL_API_SUCCESS_CODE } from '@/config'

const list = ref<MyFeedbackItem[]>([])
const loading = ref(true)
const errorText = ref('')

/** 分类展示：早期提交可能未填分类 */
const typeLabel = (value: FeedbackType | null) =>
  value ? FEEDBACK_TYPE_LABEL[value] : '其他'

const formatTime = (value: string) =>
  new Date(value).toLocaleString('zh-CN', { hour12: false })

/** 状态对应的标签配色 */
const statusTagType = (status: FeedbackStatus) => {
  if (status === 'replied') return 'success'
  if (status === 'processing') return 'warning'
  if (status === 'closed') return 'info'
  return 'primary'
}

/** 拉取列表；供父组件在提交新反馈后调用刷新 */
async function load() {
  loading.value = true
  errorText.value = ''
  try {
    const res = await fetchMyFeedback()
    if (res.code !== REAL_API_SUCCESS_CODE) {
      errorText.value = res.message || '获取反馈记录失败'
      return
    }
    list.value = res.data ?? []
  } catch {
    errorText.value = '网络异常，获取反馈记录失败'
  } finally {
    loading.value = false
  }
}

defineExpose({ load })

onMounted(load)
</script>
<style scoped>
.mf-alert {
  margin-bottom: 16px;
}

.mf-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.mf-item {
  padding: 18px 20px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 12px;
}

.mf-head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.mf-type {
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
}

.mf-time {
  margin-left: auto;
  font-size: 12px;
  color: #94a3b8;
}

.mf-content {
  margin: 10px 0 0;
  font-size: 14px;
  line-height: 1.7;
  color: #334155;
  white-space: pre-wrap;
  word-break: break-word;
}
/* 回复区左侧竖线区隔于反馈正文，不额外加底色 */
.mf-replies {
  margin-top: 14px;
  padding-left: 14px;
  border-left: 2px solid var(--brand-primary, #0ea5e9);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.mf-reply-head {
  display: flex;
  gap: 10px;
  font-size: 12px;
  color: #94a3b8;
}

.mf-reply-by {
  font-weight: 600;
  color: var(--brand-primary-dark, #0284c7);
}

.mf-reply-body {
  margin: 4px 0 0;
  font-size: 14px;
  line-height: 1.7;
  color: #334155;
  white-space: pre-wrap;
  word-break: break-word;
}

.mf-pending {
  margin: 12px 0 0;
  font-size: 12px;
  color: #94a3b8;
}
</style>
