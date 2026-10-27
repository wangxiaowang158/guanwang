<template>
  <!-- 图片或视频二选一：同一列存一个地址，前台按扩展名区分（见 web utils/media.ts） -->
  <div class="media-cell">
    <a-radio-group v-model:value="kind" size="small" button-style="solid" @change="onKindChange">
      <a-radio-button value="image">图片</a-radio-button>
      <a-radio-button value="video">视频</a-radio-button>
    </a-radio-group>
    <VideoUpload
      v-if="kind === 'video'"
      :model-value="modelValue"
      tip="静音循环播放"
      @update:model-value="(v) => emit('update:modelValue', v)"
    />
    <ImageUpload v-else :model-value="modelValue" @update:model-value="(v) => emit('update:modelValue', v)" />
  </div>
</template>

<script setup lang="ts">
// 图集等「只存一列地址」的位置用：切换类型时清空已填地址，避免图片地址留在视频控件里
import { ref, watch } from 'vue'
import ImageUpload from '../ImageUpload.vue'
import VideoUpload from '../VideoUpload.vue'

const props = defineProps<{ modelValue?: string }>()
const emit = defineEmits<{ 'update:modelValue': [string] }>()

/** 与前台 isVideoUrl 同口径：mp4/webm/ogv/ogg 视为视频 */
const VIDEO_EXT = /\.(mp4|webm|ogv|ogg)(?:[?#]|$)/i
const kindOf = (url?: string): 'image' | 'video' => (url && VIDEO_EXT.test(url) ? 'video' : 'image')

const kind = ref(kindOf(props.modelValue))
// 外部改值（上下移、回填草稿）时跟随；空值保持用户当前选择
watch(() => props.modelValue, (v) => { if (v) kind.value = kindOf(v) })

const onKindChange = () => {
  if (props.modelValue && kindOf(props.modelValue) !== kind.value) emit('update:modelValue', '')
}
</script>

<style scoped>
.media-cell {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>
