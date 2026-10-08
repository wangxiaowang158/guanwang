// 字段元数据 —— 栏目 formFields / listColumns 里的字段 key 在此解析为标签与控件类型
// ContentList 与 ContentEdit 共用，保证列表列与编辑表单字段一致
import { HOME_ICON_OPTIONS } from './homeIcons'

export type FieldWidget =
  | 'text' | 'textarea' | 'richtext' | 'image' | 'cover' | 'video' | 'file'
  | 'link' | 'datetime' | 'switch' | 'select'

export interface FieldDef {
  label: string
  widget: FieldWidget
  required?: boolean
  maxlength?: number
  tip?: string // 控件下方提示（如建议尺寸）
  /** 固定选项的下拉字段；未给时由父级按字段传入（如类别取自分类栏目） */
  options?: { label: string; value: string }[]
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
  cover: { label: '封面图片', widget: 'cover', tip: '建议尺寸：见前台板块要求' },
  video: { label: '视频', widget: 'video', tip: '前台视频板块的播放源；封面图会作为播放前的首帧' },
  whiteCover: { label: '白色图片', widget: 'image', tip: '建议尺寸：800*540px' },
  file: { label: '文件地址', widget: 'file' },
  link: { label: '链接', widget: 'link' },
  // 下拉而非文本：前台按此值与分类栏目名精确比对做筛选，
  // 手输的空格或同义词会让前台筛不出内容，且后台看不出异常。选项来源见 categorySources.ts
  category: { label: '产品类别', widget: 'select', tip: '选项取自对应的分类栏目，前台按此值筛选' },
  brand: { label: '产品品牌', widget: 'text' },
  // 下拉而非文本：前台只认白名单内的图标名，手输拼错就不显示（见 homeIcons.ts）
  icon: { label: '图标', widget: 'select', options: HOME_ICON_OPTIONS, tip: '不选时前台显示序号' },
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

/**
 * 按栏目覆盖字段标签与提示
 * 首页板块共用 content 宽表的通用列，通用标签说不清这一列在前台是什么：
 * 业绩的「标题」其实是数值、「副标题」其实是单位，不改名运营无从下手
 */
const CHANNEL_FIELD_OVERRIDES: Record<string, Record<string, Partial<FieldDef>>> = {
  'home-intro': {
    subtitle: { label: '副标题', tip: '显示在标题下方的一句话概述' },
    content: { label: '简介正文' },
  },
  'home-philosophy': {
    title: { label: '理念标语', tip: '留空时取基本信息中的主标语' },
    content: { label: '理念阐述' },
  },
  'home-business': {
    description: { label: '业务说明' },
  },
  'home-product': {
    name: { label: '产品名称' },
    subtitle: { label: '一句话概述' },
    content: { label: '产品特性', tip: '每段一条特性，前台按段落逐条列出' },
    cover: { label: '产品图片' },
  },
  'home-service': {
    description: { label: '服务说明' },
  },
  'home-customer': {
    title: { label: '合作伙伴名称' },
    whiteCover: { label: '伙伴 Logo', tip: 'Logo 加载失败时前台显示名称' },
    link: { label: '官网链接', tip: '填写后点击 Logo 跳转，仅支持 http(s) 地址' },
  },
  'home-achievement': {
    title: { label: '数值', maxlength: 12, tip: '只填数字，如 300' },
    subtitle: { label: '单位', maxlength: 10, tip: '如 +、万、%' },
    description: { label: '说明', tip: '数值下方的文字，如「服务客户」' },
  },
  'home-social': {
    description: { label: '贡献说明' },
    cover: { label: '配图' },
  },
  'home-view': {
    title: { label: '来源名称', tip: '如媒体栏目名、协会名称' },
    description: { label: '评价内容' },
    cover: { label: '配图', tip: '如节目截图、证书照片；不填时前台只显示文字' },
    link: { label: '原文链接', tip: '填写后可点击查看原文，仅支持 http(s) 地址' },
  },
}

/**
 * 取字段定义，未知字段回退为文本框
 * @param key 字段 key
 * @param channelKey 所属栏目，命中覆盖表时替换标签与提示
 */
export const getFieldDef = (key: string, channelKey?: string): FieldDef => {
  const base = FIELD_DEFS[key] || { label: key, widget: 'text' }
  const override = channelKey ? CHANNEL_FIELD_OVERRIDES[channelKey]?.[key] : undefined
  return override ? { ...base, ...override } : base
}
