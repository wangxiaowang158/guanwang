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
    return [
      {
        tag: 'video',
        // 外部粘贴的视频常写成 <video><source src>，地址不在 video 上，回退读第一个 source
        getAttrs: (el) => {
          const node = el as HTMLElement
          const src = node.getAttribute('src') || node.querySelector('source[src]')?.getAttribute('src')
          return src ? { src, poster: node.getAttribute('poster') } : false
        },
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'video',
      // playsinline：iOS 上不加会一点播放就强制全屏
      mergeAttributes(HTMLAttributes, { controls: 'true', preload: 'metadata', playsinline: 'true' }),
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
