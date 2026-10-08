<template>
  <div class="rich-editor">
    <div v-if="editor" class="toolbar">
      <button type="button" :class="btn('bold')" @click="editor.chain().focus().toggleBold().run()">B</button>
      <button type="button" :class="btn('italic')" @click="editor.chain().focus().toggleItalic().run()"><i>I</i></button>
      <button type="button" :class="btn('strike')" @click="editor.chain().focus().toggleStrike().run()"><s>S</s></button>
      <span class="sep" />
      <button type="button" :class="btn('heading', { level: 2 })" @click="editor.chain().focus().toggleHeading({ level: 2 }).run()">H2</button>
      <button type="button" :class="btn('heading', { level: 3 })" @click="editor.chain().focus().toggleHeading({ level: 3 }).run()">H3</button>
      <button type="button" :class="btn('bulletList')" @click="editor.chain().focus().toggleBulletList().run()">• 列表</button>
      <button type="button" :class="btn('orderedList')" @click="editor.chain().focus().toggleOrderedList().run()">1. 列表</button>
      <button type="button" :class="btn('blockquote')" @click="editor.chain().focus().toggleBlockquote().run()">引用</button>
      <span class="sep" />
      <button type="button" class="tb-btn" @click="imagePickerOpen = true">图片</button>
      <button type="button" class="tb-btn" :disabled="videoUploading" @click="addVideo">
        {{ videoUploading ? `上传中 ${videoProgress}%` : '视频' }}
      </button>
      <button type="button" class="tb-btn" @click="editor.chain().focus().undo().run()">撤销</button>
      <button type="button" class="tb-btn" @click="editor.chain().focus().redo().run()">重做</button>
    </div>
    <editor-content :editor="editor" class="editor-body" />
    <!-- 插图：素材库 / 本地上传 / AI 生成 -->
    <CoverPickerModal v-model:open="imagePickerOpen" title="插入图片" @confirm="onImagePicked" />
    <input ref="videoRef" type="file" :accept="UPLOAD_VIDEO_ACCEPT" style="display: none" @change="onVideo" />
  </div>
</template>

<script setup lang="ts">
// 富文本编辑器：基于 tiptap，插图经选择弹窗（素材库/上传/AI）取得站内地址后内联
import { ref, watch, onBeforeUnmount } from 'vue'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import { UPLOAD_VIDEO_ACCEPT } from '@/config'
import { useVideoUpload } from '@/composables/useVideoUpload'
import { Video } from './videoNode'
import CoverPickerModal from './CoverPickerModal.vue'

const props = defineProps<{ modelValue?: string }>()
const emit = defineEmits<{ 'update:modelValue': [string] }>()

const imagePickerOpen = ref(false)
const videoRef = ref<HTMLInputElement>()

const editor = useEditor({
  content: props.modelValue || '',
  extensions: [StarterKit, Image, Video],
  onUpdate: ({ editor }) => {
    emit('update:modelValue', editor.getHTML())
  }
})

// 外部值变化时同步（避免与内部输入循环）
watch(() => props.modelValue, (val) => {
  if (editor.value && val !== editor.value.getHTML()) {
    editor.value.commands.setContent(val || '', { emitUpdate: false })
  }
})

// 工具按钮激活态样式
const btn = (name: string, attrs?: Record<string, unknown>) => [
  'tb-btn',
  { active: editor.value?.isActive(name, attrs) }
]

// 弹窗只回传站内地址，此处负责插入正文
const onImagePicked = (url: string) => {
  editor.value?.chain().focus().setImage({ src: url }).run()
}

const {
  uploading: videoUploading,
  progress: videoProgress,
  pickAndUpload: pickAndUploadVideo,
} = useVideoUpload()

const addVideo = () => {
  if (videoUploading.value) return
  videoRef.value?.click()
}

const onVideo = async (e: Event) => {
  const url = await pickAndUploadVideo(e.target as HTMLInputElement)
  if (url) editor.value?.chain().focus().setVideo({ src: url }).run()
}

onBeforeUnmount(() => editor.value?.destroy())
</script>

<style scoped>
.rich-editor {
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  overflow: hidden;
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  padding: 6px 8px;
  background: #fafafa;
  border-bottom: 1px solid #f0f0f0;
}

.tb-btn {
  min-width: 30px;
  height: 28px;
  padding: 0 8px;
  font-size: 13px;
  background: #fff;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  cursor: pointer;
  color: #595959;
}

.tb-btn:hover {
  color: #2f7cff;
  border-color: #2f7cff;
}

.tb-btn.active {
  color: #fff;
  background: #2f7cff;
  border-color: #2f7cff;
}

/* 上传中禁用，需覆盖 hover 态否则鼠标移上去仍显示可点 */
.tb-btn:disabled,
.tb-btn:disabled:hover {
  cursor: not-allowed;
  color: #bfbfbf;
  border-color: #d9d9d9;
}

.sep {
  width: 1px;
  height: 18px;
  background: #e8e8e8;
  margin: 0 2px;
}

.editor-body {
  min-height: 280px;
  padding: 12px;
}

:deep(.ProseMirror) {
  min-height: 256px;
  outline: none;
}

:deep(.ProseMirror img) {
  max-width: 100%;
}

:deep(.ProseMirror video) {
  max-width: 100%;
  display: block;
  background: #000;
}

/* 选中的视频节点给出边框提示，否则原子节点被选中时没有任何视觉反馈 */
:deep(.ProseMirror video.ProseMirror-selectednode) {
  outline: 2px solid #2f7cff;
}

:deep(.ProseMirror p.is-editor-empty:first-child::before) {
  content: '请输入内容';
  color: #bfbfbf;
  float: left;
  pointer-events: none;
  height: 0;
}
</style>
