// 字段元数据 —— 栏目 formFields / listColumns 里的字段 key 在此解析为标签与控件类型
// ContentList 与 ContentEdit 共用，保证列表列与编辑表单字段一致

export type FieldWidget =
  | 'text' | 'textarea' | 'richtext' | 'image' | 'file'
  | 'link' | 'datetime' | 'switch' | 'select'

export interface FieldDef {
  label: string
  widget: FieldWidget
  required?: boolean
  maxlength?: number
  tip?: string // 控件下方提示（如建议尺寸）
}

// 编辑表单字段定义
export const FIELD_DEFS: Record<string, FieldDef> = {
  title: { label: '标题', widget: 'text', required: true, maxlength: 100 },
  name: { label: '名称', widget: 'text', required: true, maxlength: 50 },
  subtitle: { label: '副标题', widget: 'text', maxlength: 100 },
  keywords: { label: '关键字', widget: 'text', maxlength: 200 },
  description: { label: '描述', widget: 'textarea', maxlength: 500 },
  intro: { label: '简介', widget: 'textarea', maxlength: 500 },
  content: { label: '内容', widget: 'richtext' },
  cover: { label: '封面图片', widget: 'image', tip: '建议尺寸：见前台板块要求' },
  whiteCover: { label: '白色图片', widget: 'image', tip: '建议尺寸：800*540px' },
  file: { label: '文件上传', widget: 'file' },
  link: { label: '链接', widget: 'link' },
  category: { label: '产品类别', widget: 'text' },
  brand: { label: '产品品牌', widget: 'text' },
  author: { label: '作者', widget: 'text', maxlength: 50 },
  source: { label: '来源', widget: 'text', maxlength: 50 },
  updateTime: { label: '更新日期', widget: 'datetime' },
  isTop: { label: '置顶', widget: 'switch' }
}

// 列表列定义（表头标签）—— 排序改为名称后拖拽手柄，不再作为独立列
export const COLUMN_LABELS: Record<string, string> = {
  index: '序号',
  title: '标题',
  name: '名称',
  brand: '品牌管理',
  createTime: '创建日期',
  isTop: '置顶'
}

/** 取字段定义，未知字段回退为文本框 */
export const getFieldDef = (key: string): FieldDef =>
  FIELD_DEFS[key] || { label: key, widget: 'text' }
