// tiptap 视频节点 —— 正文内嵌视频用
// tiptap 官方没有 video 扩展，自定义一个：以块级原子节点存 <video>，
// 与图片不同，视频不做行内排版，独占一行
import { Node, mergeAttributes } from '@tiptap/core'

/** setVideo 命令的入参 */
export interface SetVideoOptions {
  src: string
  poster?: string
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    video: {
      /** 在光标处插入一段视频 */
      setVideo: (options: SetVideoOptions) => ReturnType
    }
  }
}

/**
 * 正文视频节点
 * 固定输出 controls + preload="metadata"：
 * preload 只取元数据，避免一进编辑器就把整段视频拉下来
 */
export const Video = Node.create({
  name: 'video',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src: { default: null },
      poster: { default: null },
    }
  },

  parseHTML() {
    return [{ tag: 'video' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'video',
      mergeAttributes(HTMLAttributes, { controls: 'true', preload: 'metadata' }),
    ]
  },

  addCommands() {
    return {
      setVideo:
        (options) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: options }),
    }
  },
})
