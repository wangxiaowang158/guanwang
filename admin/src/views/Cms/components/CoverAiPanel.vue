<template>
  <div class="ai-panel">
    <a-alert
      v-if="enabled === false"
      type="warning"
      show-icon
      message="未配置 AI 生图服务"
      description="请联系管理员在服务端配置 AI_IMAGE_API_KEY 后再使用；素材库与本地上传不受影响。"
    />
    <template v-else>
      <div class="ai-bar">
        <a-input
          v-model:value="prompt"
          :maxlength="PROMPT_MAX"
          show-count
          allow-clear
          placeholder="描述想要的封面，如：智慧能源园区"
          :disabled="loading"
          @press-enter="generate"
        />
        <a-button type="primary" :loading="loading" :disabled="!prompt.trim()" @click="generate">
          生成
        </a-button>
        <a-button :disabled="loading || !lastPrompt" @click="regenerate">换一批</a-button>
      </div>

      <a-spin :spinning="loading" tip="生成中，通常需要 10 到 60 秒…">
        <ul v-if="items.length" class="ai-grid">
          <li
            v-for="item in items"
            :key="item.id"
            class="ai-cell"
            :class="{ 'ai-cell--active': item.id === selectedId }"
            @click="emit('pick', item)"
          >
            <img :src="item.previewUrl" alt="AI 候选封面" width="240" height="160" />
          </li>
        </ul>
        <a-empty v-else class="ai-empty" description="输入描述后点击生成" />
      </a-spin>

      <p class="ai-tip">
        每次生成 5 个候选，点击即选中；点「应用」后才会保存，未选中的候选不会入库。
      </p>
    </template>
  </div>
</template>

<script setup lang="ts">
// 封面图 AI 生成面板：输入描述生成候选，点选后交给弹窗，由弹窗在「应用」时统一保存
import { onMounted, ref } from 'vue'
import { message } from 'ant-design-vue'
import { generateAiImages, getAiImageStatus, type AiImageCandidate } from '@/api/upload'

/** 与服务端 AI_IMAGE.promptMaxLen 保持一致 */
const PROMPT_MAX = 50
const GENERATE_FAILED = '生成失败，请稍后重试'

defineProps<{ selectedId?: string }>()
const emit = defineEmits<{ pick: [AiImageCandidate] }>()

// null 表示状态尚未取回，避免先闪一下「未配置」
const enabled = ref<boolean | null>(null)
const prompt = ref('')
// 「换一批」沿用上一次成功提交的描述，而不是输入框里可能已被改动的内容
const lastPrompt = ref('')
const loading = ref(false)
const items = ref<AiImageCandidate[]>([])

// 进入面板时查询服务端是否已配置密钥
onMounted(async () => {
  try {
    const res = await getAiImageStatus()
    enabled.value = res.data.data?.enabled ?? false
  } catch {
    enabled.value = false
  }
})

/** 调用生成接口，成功后整批替换候选；失败保留旧候选 */
const run = async (text: string) => {
  if (loading.value) return
  loading.value = true
  try {
    const res = await generateAiImages(text)
    if (res.data.code !== 200 || !res.data.data?.items?.length) {
      message.error(res.data.message || GENERATE_FAILED)
      return
    }
    items.value = res.data.data.items
    lastPrompt.value = text
  } catch {
    message.error(GENERATE_FAILED)
  } finally {
    loading.value = false
  }
}

const generate = () => {
  const text = prompt.value.trim()
  if (text) run(text)
}

const regenerate = () => {
  if (lastPrompt.value) run(lastPrompt.value)
}
</script>

<style scoped>
.ai-bar {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.ai-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.ai-cell {
  border: 2px solid transparent;
  border-radius: 6px;
  overflow: hidden;
  cursor: pointer;
  background: #fafafa;
}

.ai-cell--active {
  border-color: #1677ff;
}

.ai-cell img {
  display: block;
  width: 100%;
  height: auto;
  /* 生图为 3:2 横图，按比例缩放即可，不裁切 */
  aspect-ratio: 3 / 2;
  object-fit: cover;
}

.ai-empty {
  padding: 48px 0;
}

.ai-tip {
  margin: 12px 0 0;
  color: #8c8c8c;
  font-size: 12px;
}
</style>
