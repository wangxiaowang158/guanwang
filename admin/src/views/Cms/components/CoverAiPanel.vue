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
          :maxlength="promptMax"
          show-count
          allow-clear
          :placeholder="preset.placeholder"
          :disabled="loading"
          @press-enter="generate"
        />
        <a-button type="primary" :loading="loading" :disabled="!prompt.trim()" @click="generate">
          生成
        </a-button>
        <a-button :disabled="loading || !lastPrompt" @click="regenerate">换一批</a-button>
      </div>
      <!-- 示例描述：不知道怎么写时点一下即可填入，再按需修改 -->
      <div class="ai-samples">
        <span>试试：</span>
        <!-- 用按钮而非标签：可 Tab 聚焦、回车/空格触发 -->
        <a-button
          v-for="s in preset.samples"
          :key="s"
          size="small"
          class="ai-sample"
          :disabled="loading"
          @click="prompt = s"
        >
          {{ s }}
        </a-button>
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
            <img :src="item.previewUrl" alt="AI 候选图" width="240" height="160" :style="{ aspectRatio: preset.ratio }" />
          </li>
        </ul>
        <a-empty v-else class="ai-empty" description="输入描述后点击生成" />
      </a-spin>

      <p class="ai-tip">
        每次生成 {{ count }} 个候选，点击即选中；点「应用」后才会保存进素材库，未选中的候选不会入库。
      </p>
    </template>
  </div>
</template>

<script setup lang="ts">
// 封面图 AI 生成面板：输入描述生成候选，点选后交给弹窗，由弹窗在「应用」时统一保存
import { computed, onMounted, ref } from 'vue'
import { message } from 'ant-design-vue'
import {
  generateAiImages,
  getAiImageStatus,
  type AiImageCandidate,
  type AiImageScene
} from '@/api/upload'

const GENERATE_FAILED = '生成失败，请稍后重试'

/** 各场景的预览比例、占位提示与示例描述；比例须与服务端 AI_IMAGE_SCENES 的尺寸对应 */
const SCENE_PRESETS: Record<AiImageScene, { ratio: string; placeholder: string; samples: string[] }> = {
  cover: {
    ratio: '3 / 2',
    placeholder: '描述想要的封面，如：智慧能源园区',
    samples: ['现代化工业园区航拍', '团队在会议室讨论方案', '城市天际线黄昏']
  },
  banner: {
    ratio: '3 / 2',
    placeholder: '描述想要的背景，如：蓝色科技感城市夜景',
    samples: ['深蓝色科技感抽象线条', '夜晚城市高楼灯光', '晨雾中的远山']
  },
  square: {
    ratio: '1 / 1',
    placeholder: '描述想要的图标，如：扁平风格的齿轮图标',
    samples: ['扁平风格的盾牌图标', '简约的地球图标', '握手合作图标']
  },
  illustration: {
    ratio: '3 / 2',
    placeholder: '描述想要的配图，如：工程师在现场巡检设备',
    samples: ['工程师在现场巡检设备', '数据中心机房', '施工现场全景']
  }
}

const props = withDefaults(defineProps<{ selectedId?: string; scene?: AiImageScene }>(), {
  scene: 'cover'
})
const emit = defineEmits<{ pick: [AiImageCandidate] }>()

const preset = computed(() => SCENE_PRESETS[props.scene])
// 默认值兜底：状态接口取回前、或旧版服务端未下发时使用
const count = ref(5)
const promptMax = ref(50)

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
    const status = res.data.data
    enabled.value = status?.enabled ?? false
    if (status?.count) count.value = status.count
    if (status?.promptMaxLen) promptMax.value = status.promptMaxLen
  } catch {
    enabled.value = false
  }
})

/** 调用生成接口，成功后整批替换候选；失败保留旧候选 */
const run = async (text: string) => {
  if (loading.value) return
  loading.value = true
  try {
    const res = await generateAiImages(text, props.scene)
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
  /* 宽高比随场景由行内样式给出，与出图尺寸一致，不会裁切 */
  object-fit: cover;
}

.ai-samples {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin: -8px 0 16px;
  color: #8c8c8c;
  font-size: 12px;
}

.ai-sample {
  font-size: 12px;
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
