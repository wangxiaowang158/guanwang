// 素材库展示格式化 —— 管理页与选择器弹窗共用

/**
 * 字节数转可读体积
 * @param bytes 字节数
 */
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

/**
 * 毫秒时间戳转本地时间
 * @param ms 毫秒时间戳
 */
export function formatTime(ms: number): string {
  return new Date(ms).toLocaleString('zh-CN', { hour12: false })
}

/** 类型筛选选项，顺序即界面顺序 */
export const TYPE_OPTIONS = [
  { value: 'all', label: '全部' },
  { value: 'image', label: '图片' },
  { value: 'video', label: '视频' },
  { value: 'other', label: '其他' }
] as const

/** 排序选项 */
export const SORT_OPTIONS = [
  { value: 'mtime-desc', label: '最新上传' },
  { value: 'mtime-asc', label: '最早上传' },
  { value: 'size-desc', label: '体积从大到小' },
  { value: 'size-asc', label: '体积从小到大' }
] as const
