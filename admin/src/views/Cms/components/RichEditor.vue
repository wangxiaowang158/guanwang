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
      <button type="button" class="tb-btn" @click="addImage">图片</button>
      <button type="button" class="tb-btn" @click="editor.chain().focus().undo().run()">撤销</button>
      <button type="button" class="tb-btn" @click="editor.chain().focus().redo().run()">重做</button>
    </div>
    <editor-content :editor="editor" class="editor-body" />
    <input ref="imgRef" type="file" :accept="UPLOAD_ACCEPT" style="display: none" @change="onImage" />
  </div>
</template>

<script setup lang="ts">
// 富文本编辑器：基于 tiptap，图片以 base64 内联（mock 阶段无后端）
import { ref, watch, onBeforeUnmount } from 'vue'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import { message } from 'ant-design-vue'
import {
  UPLOAD_ACCEPT, UPLOAD_MAX_MB, UPLOAD_MAX_BYTES,
  UPLOAD_IMAGE_MIMES, UPLOAD_IMAGE_LABEL
} from '@/config'

const props = defineProps<{ modelValue?: string }>()
const emit = defineEmits<{ 'update:modelValue': [string] }>()

const imgRef = ref<HTMLInputElement>()

const editor = useEditor({
  content: props.modelValue || '',
  extensions: [StarterKit, Image],
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

const addImage = () => imgRef.value?.click()

// 插入图片：校验类型与大小后转 base64；限制取自 config，与 ImageUpload 一致
// 类型必须校验：accept 只约束选择框，用户仍可拖拽或改筛选条件绕过
const onImage = (e: Event) => {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  if (!(UPLOAD_IMAGE_MIMES as readonly string[]).includes(file.type)) {
    message.error(`请上传 ${UPLOAD_IMAGE_LABEL} 格式图片`)
    input.value = ''
    return
  }
  if (file.size > UPLOAD_MAX_BYTES) {
    message.error(`图片大小不能超过 ${UPLOAD_MAX_MB}MB`)
    input.value = ''
    return
  }
  const reader = new FileReader()
  reader.onload = () => {
    editor.value?.chain().focus().setImage({ src: String(reader.result) }).run()
  }
  reader.readAsDataURL(file)
  input.value = ''
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

:deep(.ProseMirror p.is-editor-empty:first-child::before) {
  content: '请输入内容';
  color: #bfbfbf;
  float: left;
  pointer-events: none;
  height: 0;
}
</style>
