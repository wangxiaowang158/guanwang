// 字段元数据 —— 栏目 formFields / listColumns 里的字段 key 在此解析为标签与控件类型
// ContentList 与 ContentEdit 共用，保证列表列与编辑表单字段一致
import { HOME_ICON_OPTIONS } from './homeIcons'

export type FieldWidget =
  | 'text' | 'textarea' | 'richtext' | 'image' | 'cover' | 'video' | 'file'
  | 'link' | 'datetime' | 'switch' | 'select'
  // 以下控件读写 content.extra 里的键，而非 content 顶层列
  | 'extra-tags' | 'extra-business' | 'extra-metrics' | 'extra-pains'
  | 'extra-items' | 'extra-facts' | 'extra-gallery' | 'extra-quote'

/** 扩展字段 key：值存放在 content.extra[key]，由 ContentForm 单独读写 */
export const EXTRA_FIELD_KEYS = [
  'business', 'industries', 'tags', 'metrics', 'pains',
  'steps', 'modes', 'facts', 'gallery', 'quote',
] as const
export type ExtraFieldKey = (typeof EXTRA_FIELD_KEYS)[number]

/** 是否扩展字段 */
export const isExtraField = (key: string): key is ExtraFieldKey =>
  (EXTRA_FIELD_KEYS as readonly string[]).includes(key)

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
  // keywords 只进 <meta name="keywords">，页面上不显示
  keywords: { label: 'SEO 关键词', widget: 'text', maxlength: 200, tip: '选填。只给搜索引擎看，页面上不显示；多个词用英文逗号分隔' },
  // description 两用：卡片/列表里的摘要文字，同时是文章页的搜索结果摘要
  description: { label: '描述', widget: 'textarea', maxlength: 500, tip: '列表与卡片里显示的摘要，也是搜索结果里的介绍文字' },
  intro: { label: '简介', widget: 'textarea', maxlength: 500 },
  content: { label: '内容', widget: 'richtext' },
  cover: { label: '封面图片', widget: 'cover', tip: '建议 1200×750px（16:10）；卡片里按比例裁切，主体请放在画面中间' },
  video: { label: '视频', widget: 'video', tip: '选填。视频板块里为播放源；卡片、磁贴、品牌等图片位配了视频则改为静音循环播放；封面图作首帧' },
  whiteCover: { label: '白色图片', widget: 'image', tip: '建议尺寸：800*540px' },
  // 提示写在 FileUpload 控件内（格式与大小上限），这里不再重复
  file: { label: '附件', widget: 'file' },
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
  isTop: { label: '置顶', widget: 'switch' },
  // ---- 扩展字段（存于 content.extra）----
  business: { label: '业务线', widget: 'extra-business', tip: '用于前台按业务线筛选' },
  industries: { label: '所属行业', widget: 'extra-tags', tip: '输入后回车添加，可多个；用于前台按行业筛选' },
  tags: { label: '标签', widget: 'extra-tags', tip: '输入后回车添加，最多 30 个，每个不超过 30 字' },
  metrics: { label: '量化指标', widget: 'extra-metrics', tip: '指标名称与数值都填写才会保存' },
  pains: { label: '客户痛点与方案', widget: 'extra-pains', tip: '痛点标题必填，其余选填' },
  steps: { label: '服务流程', widget: 'extra-items', tip: '按顺序展示，可上下调整' },
  modes: { label: '合作模式', widget: 'extra-items' },
  facts: { label: '基础信息', widget: 'extra-facts', tip: '如面积、业态、合作模式；名称与内容都填写才会保存' },
  gallery: { label: '现场实拍', widget: 'extra-gallery', tip: '现场实拍、系统截图或视频，最多 30 项' },
  quote: { label: '客户证言', widget: 'extra-quote' },
}

/** 栏目管理里「扩展字段」分组的字段 key，与上方扩展字段保持一致 */
export const EXTRA_FIELD_OPTIONS = EXTRA_FIELD_KEYS.map(k => ({ label: FIELD_DEFS[k].label, value: k }))

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
    // 首页「战略合作」按此分三组展示；固定选项，避免手输出第四个组
    category: {
      label: '伙伴分组',
      tip: '首页按分组展示；不选归入「合作伙伴」',
      options: ['产业伙伴', '科创伙伴', '合作伙伴'].map(v => ({ label: v, value: v })),
    },
    whiteCover: { label: '伙伴 Logo', tip: 'Logo 加载失败时前台显示名称' },
    link: { label: '官网链接', tip: '填写后点击 Logo 跳转，仅支持 http(s) 地址' },
  },
  // 招聘职位区块（layout=jobs）复用宽表通用列，逐列改成招聘语义
  'about-jobs': {
    title: { label: '职位名称' },
    subtitle: { label: '工作地点', tip: '如：北京·海淀' },
    brand: { label: '所属部门' },
    description: { label: '职位亮点', tip: '一句话，列表里显示' },
    content: { label: '职责与要求' },
  },
  'home-advantage': {
    title: { label: '优势名称', tip: '如：方案定制' },
    description: { label: '优势说明' },
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
