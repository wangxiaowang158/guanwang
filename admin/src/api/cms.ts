// CMS 接口层 —— 栏目(channel) / 内容(content) / 站点信息(site)
// 走真实后端 /api/mgmt/{channel,content,site}/*
import axios from 'axios'
import type { ApiResult } from './auth'

/** 栏目节点（同时驱动菜单与页面） */
export interface Channel {
  id: number
  parentId: number | null
  key: string
  name: string
  type:
    | 'group' | 'list' | 'single' | 'siteconfig' | 'admins'
    // 会员中心四项，读写真实后端
    | 'members' | 'feedback' | 'authconfig' | 'loginlog'
  icon?: string
  /** 是否隐藏：仅一级模块有效，隐藏后后台侧边栏与官网前台都不再出现 */
  hidden?: boolean
  sort: number
  formFields: string[]
  listColumns: string[]
  // 前台区块配置 —— 子栏目作为父页面的一个内容区块时使用
  /** 区块锚点，小写字母/数字/连字符；为空则该子栏目不在前台成块 */
  anchor?: string
  /** 区块副标题 */
  subheading?: string
  /** 区块展示形态 */
  layout?: BlockLayout
  /** 超级下拉菜单分组名，同组子项在菜单里归为一列 */
  menuGroup?: string
  /** 超级下拉菜单里该项下方的一句说明 */
  menuDesc?: string
  /** 前台页面路径（仅一级栏目），如 /energy-solutions/overview；为空表示该栏目不对应前台页面 */
  portalPath?: string
  /** 菜单挂靠：在官网导航里归到哪个一级栏目（填其 key）的下拉之下 */
  menuParent?: string
  /** 导航外链（http/https），与页面路径二选一 */
  externalUrl?: string
  /** 页面头图背景图 */
  heroBg?: string
  /** 页面头图背景视频 */
  heroVideo?: string
  // 区块外观 —— 仅区块子栏目使用；空值为模板默认
  /** 区块底色：auto 默认交替 / white / surface 浅色 / dark 深色 / image 背景图 */
  blockTone?: BlockTone
  /** 区块背景图，底色为 image 时生效 */
  blockBg?: string
  /** 桌面每行列数 2/3/4，0 或空为展示形态默认 */
  blockColumns?: number
  /** 区块标题对齐 */
  headingAlign?: '' | 'center' | 'left'
  // 页面头图文案 —— 仅顶级板块页使用，前台栏目页顶部展示
  /** Hero 眉标题，标题上方的小字 */
  heroEyebrow?: string
  /** Hero 主标题，为空时前台回落到栏目名称 */
  heroTitle?: string
  /** Hero 描述，标题下方的说明文字 */
  heroDesc?: string
  // 栏目页 SEO 元信息（TDK）—— 仅顶级板块页使用
  seoTitle?: string
  seoKeywords?: string
  seoDescription?: string
  updateTime?: string
}

/** 前台区块展示形态，与后端 BLOCK_LAYOUT 保持一致 */
export type BlockLayout =
  | 'cards' | 'list' | 'tags' | 'steps' | 'rich' | 'video'
  | 'pains' | 'flow' | 'metrics' | 'modes' | 'quote' | 'gallery'
  | 'media' | 'brand' | 'tiles' | 'jobs'

/** 展示形态下拉选项 */
export const BLOCK_LAYOUT_OPTIONS: { label: string; value: BlockLayout }[] = [
  { label: '图标卡片', value: 'cards' },
  { label: '横向列表', value: 'list' },
  { label: '标签云', value: 'tags' },
  { label: '编号流程', value: 'steps' },
  { label: '图文段落', value: 'rich' },
  { label: '视频', value: 'video' },
  { label: '痛点与方案', value: 'pains' },
  { label: '全链条流程', value: 'flow' },
  { label: '量化价值看板', value: 'metrics' },
  { label: '合作模式', value: 'modes' },
  { label: '客户证言', value: 'quote' },
  { label: '图集', value: 'gallery' },
  { label: '图片/视频展示（信息图、架构图、截图）', value: 'media' },
  { label: '品牌介绍（卡片 + 品牌故事弹窗）', value: 'brand' },
  { label: '图片磁贴（客户价值、应用场景）', value: 'tiles' },
  { label: '招聘职位（可展开职责与要求）', value: 'jobs' },
]

/** 各展示形态推荐的内容字段：新建区块时自动勾选，与种子 LAYOUT_FIELDS 一致 */
export const LAYOUT_DEFAULT_FIELDS: Partial<Record<BlockLayout, string[]>> = {
  media: ['title', 'description', 'cover', 'video', 'isTop'],
  tiles: ['title', 'description', 'cover', 'video', 'link', 'isTop'],
  brand: ['title', 'subtitle', 'description', 'cover', 'video', 'content', 'isTop'],
  cards: ['title', 'description', 'cover', 'video', 'link', 'content', 'isTop'],
  rich: ['title', 'content', 'isTop'],
  video: ['title', 'description', 'cover', 'video', 'isTop'],
  // 职位名 / 工作地点 / 部门 / 亮点 / 职责与要求
  jobs: ['title', 'subtitle', 'brand', 'description', 'content', 'isTop'],
}

/** 业务线取值，与后端 BUSINESS_LINES 一致 */
export type BusinessLine = 'energy' | 'building' | 'living'

/** 业务线下拉选项 */
export const BUSINESS_LINE_OPTIONS: { label: string; value: BusinessLine }[] = [
  { label: '智慧能源', value: 'energy' },
  { label: '智慧建筑', value: 'building' },
  { label: '未来人居', value: 'living' },
]

/** 指标：量化价值、案例收益 */
export interface ExtraMetric { label: string; value: string; unit?: string; note?: string }
/** 痛点 → 解决方案 → 量化价值 */
export interface ExtraPain { title: string; desc?: string; solution?: string; value?: string }
/** 标题 + 说明：流程步骤、合作模式 */
export interface ExtraItem { title: string; desc?: string }
/** 键值对：案例基础信息 */
export interface ExtraFact { label: string; value: string }
/** 客户证言 */
export interface ExtraQuote { text: string; author?: string; org?: string }

/** 内容扩展数据，与后端 content-extra.ts 的 ContentExtra 同构 */
export interface ContentExtra {
  business?: BusinessLine
  industries?: string[]
  tags?: string[]
  metrics?: ExtraMetric[]
  pains?: ExtraPain[]
  steps?: ExtraItem[]
  modes?: ExtraItem[]
  facts?: ExtraFact[]
  gallery?: string[]
  quote?: ExtraQuote
}

/** 内容记录（通用字段，按栏目 formFields 取用） */
export interface Content {
  id: number
  channelKey: string
  title?: string
  name?: string
  subtitle?: string
  keywords?: string
  description?: string
  intro?: string
  content?: string
  cover?: string
  /** 视频地址，前台视频板块播放源 */
  video?: string
  whiteCover?: string
  file?: string
  link?: string
  category?: string
  brand?: string
  author?: string
  source?: string
  sort?: number
  isTop?: boolean
  /** 发布状态：草稿仅后台可见，前台只读已发布 */
  status?: ContentStatus
  /**
   * 运营设定的发布时间，`YYYY-MM-DD HH:mm:ss`；未设定时不返回
   * 保存时传空串表示清空（前台回落为创建日期），不传表示保持原值
   */
  publishAt?: string
  /** 扩展数据：读取时无则缺省；保存时传对象，传 null 表示清空 */
  extra?: ContentExtra | null
  /** 列表展示日期：已设发布时间时取发布时间，否则取创建时间 */
  createTime?: string
  updateTime?: string
}

/** 内容发布状态 */
export type ContentStatus = 'draft' | 'published'

/**
 * 内容编辑表单的模型：字段随栏目 formFields 动态取用，按字段 key 读写
 * 值只会是文本（含日期串）、数字或置顶开关；空值为 null / undefined
 */
export type ContentFormModel = Record<string, string | number | boolean | null | undefined>

/** 站点基本信息（单例） */
export interface SiteInfo {
  webTitle: string
  keywords: string
  description: string
  /** 首页主标语，前台首屏大标题；为空时前台回落到内置文案 */
  slogan: string
  /** 首页副标语，前台首屏与页脚展示；为空时前台回落到内置文案 */
  subSlogan: string
  phone: string
  website: string
  recruitEmail: string
  contactEmail: string
  address: string
  mapLng: string
  mapLat: string
  mapLink: string
  copyright: string
  /** ICP 备案号，前台页脚展示；为空时前台不展示该项 */
  icpCode: string
  /** 公安联网备案号，前台页脚展示；为空时前台不展示该项 */
  policeCode: string
  logo: string
  footerLogo: string
  wechatQr: string
  /** 网站模板：'1' 样式一（深蓝科技风）| '2' 样式二（集团品牌风） */
  template: string
  /** 首页 Hero 背景图地址（视频优先级高于图片） */
  heroImage?: string
  /** 首页 Hero 背景视频地址 */
  heroVideo?: string
  /** 首屏主按钮文字（打开节能测算预约弹窗），为空时用内置文案 */
  heroPrimaryText?: string
  /** 首屏次按钮文字（滚动至第一个板块），为空时用内置文案 */
  heroSecondaryText?: string
  /** 首屏业绩数据条的口径说明，为空不显示 */
  heroStatsNote?: string
  /** 首页联系板块主标题，为空时用内置文案 */
  contactHeading?: string
  /** 公司全称 / 简称 / 英文名，留空时前台用内置值 */
  companyName?: string
  companyShort?: string
  companyEn?: string
  /** 浏览器标签页图标 */
  favicon?: string
  /** 默认分享图：页面自身没有配图时分享卡片用这张 */
  shareImage?: string
  /** 首页板块顺序、显隐、标题与底色；后端读取时已补齐全部板块 */
  homeLayout?: HomeSectionConfig[] | null
  /** 页脚分栏、友情链接、社交账号 */
  footerConfig?: FooterConfig | null
  /** 统计与站长验证、灰色模式、悬浮咨询条、图片处理，结构与后端 common/site-ext 一致 */
  extConfig?: SiteExtConfig | null
}

/** 水印位置，与后端 WATERMARK_POSITIONS 一致 */
export type WatermarkPosition = 'bottom-right' | 'bottom-left' | 'center'

/** 站点扩展配置；后端按白名单净化，非法值静默丢弃，故前端保存前须先校验 */
export interface SiteExtConfig {
  /** 百度统计站点 ID（32 位十六进制） */
  baiduTongji?: string
  /** GA4 衡量 ID，如 G-XXXXXXX */
  gaId?: string
  /** 站长平台验证码（meta 标签 content 的值） */
  verify: { baidu?: string; google?: string; bing?: string; so360?: string; sogou?: string }
  /** 全站灰色模式：手动开关或按日期区间（北京时间，含首尾两天） */
  grayMode: { enabled: boolean; start?: string; end?: string }
  /** 悬浮咨询条 */
  floatBar: { enabled: boolean; showPhone: boolean; showWechat: boolean; kefuUrl?: string }
  /** 新上传图片的处理：水印与转 WebP */
  watermark: { enabled: boolean; text?: string; position: WatermarkPosition; webp: boolean }
}

/** 区块底色取值，与后端 BLOCK_TONES 一致 */
export type BlockTone = 'auto' | 'white' | 'surface' | 'dark' | 'image'

/** 首屏之后可排序的首页板块，与后端 HOME_SECTIONS 一致 */
export type HomeSectionKey = 'business-trio' | 'advantage' | 'case' | 'news' | 'partner' | 'view' | 'contact'

export interface HomeSectionConfig {
  key: HomeSectionKey
  visible: boolean
  eyebrow?: string
  title?: string
  tone: 'auto' | 'white' | 'surface' | 'dark'
}

/** 社交账号类型，与后端 SOCIAL_TYPES 一致 */
export type SocialType = 'wechat' | 'weibo' | 'douyin' | 'channels' | 'bilibili' | 'linkedin'

export interface FooterConfig {
  /** 页脚显示的一级导航 key（按此顺序）；空数组表示全部 */
  columns: string[]
  friendLinks: { name: string; url: string }[]
  socials: { type: SocialType; url?: string; qr?: string }[]
}

// ---------------- 栏目 ----------------

/** 获取全部栏目（扁平数组，前端自行组装为树） */
export const getChannelList = () =>
  axios.get<ApiResult<Channel[]>>('/api/mgmt/channel/list')

/** 按 key 或 id 获取单个栏目配置 */
export const getChannelDetail = (params: { key?: string; id?: number }) =>
  axios.get<ApiResult<Channel>>('/api/mgmt/channel/detail', { params })

/** 新增栏目 */
export const addChannel = (data: Partial<Channel>) =>
  axios.post<ApiResult<Channel>>('/api/mgmt/channel/add', data)

/** 更新栏目 */
export const updateChannel = (data: Partial<Channel> & { id: number }) =>
  axios.put<ApiResult<null>>('/api/mgmt/channel/update', data)

/** 批量调整排序与显隐（导航排序） */
export const sortChannels = (items: { id: number; sort: number; hidden?: boolean }[]) =>
  axios.post<ApiResult<null>>('/api/mgmt/channel/sort', { items })

/** 删除栏目（级联删除子节点） */
export const deleteChannel = (id: number) =>
  axios.delete<ApiResult<null>>(`/api/mgmt/channel/delete?id=${id}`)

// ---------------- 内容 ----------------

/** 内容列表的分页响应 */
export interface ContentPage {
  list: Content[]
  total: number
  page: number
  pageSize: number
}

/** 获取某栏目内容列表（服务端分页，支持关键字、日期、发布状态筛选） */
export const getContentList = (params: {
  channelKey: string
  keyword?: string
  startDate?: string
  endDate?: string
  status?: ContentStatus
  page?: number
  pageSize?: number
}) => axios.get<ApiResult<ContentPage>>('/api/mgmt/content/list', { params })

/** 获取单条内容详情 */
export const getContentDetail = (params: { channelKey: string; id?: number }) =>
  axios.get<ApiResult<Content | null>>('/api/mgmt/content/detail', { params })

/** 保存内容（有 id 为更新，无 id 为新增） */
export const saveContent = (data: Partial<Content> & { channelKey: string }) =>
  axios.post<ApiResult<Content>>('/api/mgmt/content/save', data)

/** 删除内容（支持批量，ids 逗号分隔） */
export const deleteContent = (channelKey: string, ids: (number | string)[]) =>
  axios.delete<ApiResult<null>>(
    `/api/mgmt/content/delete?channelKey=${encodeURIComponent(channelKey)}&ids=${ids.join(',')}`
  )

/** 切换置顶 */
export const toggleContentTop = (channelKey: string, id: number) =>
  axios.put<ApiResult<null>>('/api/mgmt/content/top', { channelKey, id })

/** 复制为草稿，返回副本（可直接打开编辑） */
export const duplicateContent = (channelKey: string, id: number) =>
  axios.post<ApiResult<Content>>('/api/mgmt/content/duplicate', { channelKey, id })

/** 批量发布 / 下线，返回实际改动条数 */
export const batchContentStatus = (channelKey: string, ids: number[], status: ContentStatus) =>
  axios.put<ApiResult<{ changed: number }>>('/api/mgmt/content/status', { channelKey, ids, status })

/** 修改排序值 */
export const updateContentSort = (channelKey: string, id: number, sort: number) =>
  axios.put<ApiResult<null>>('/api/mgmt/content/sort', { channelKey, id, sort })

// ---------------- 回收站与历史版本 ----------------

/** 回收站列表：在内容字段之外多一个删除时间，并给出保留天数 */
export interface TrashPage {
  list: (Content & { deletedAt: string })[]
  total: number
  page: number
  pageSize: number
  retentionDays: number
}

/** 某栏目回收站列表 */
export const getTrashList = (params: { channelKey: string; page?: number; pageSize?: number }) =>
  axios.get<ApiResult<TrashPage>>('/api/mgmt/content/trash', { params })

/** 从回收站恢复 */
export const restoreTrash = (channelKey: string, ids: number[]) =>
  axios.put<ApiResult<{ changed: number }>>('/api/mgmt/content/trash/restore', { channelKey, ids })

/** 彻底删除（仅回收站内的内容，不可恢复） */
export const purgeTrash = (channelKey: string, ids: number[]) =>
  axios.delete<ApiResult<{ changed: number }>>('/api/mgmt/content/trash/purge', { data: { channelKey, ids } })

/** 历史版本列表项 */
export interface ContentRevision {
  id: number
  title: string
  operator: string
  createdAt: string
}

/** 历史版本快照：保存前的字段值，publishAt 为 ISO 串 */
export type RevisionSnapshot = Partial<Record<string, string | number | boolean | null>>

/** 某条内容的历史版本，新的在前 */
export const getRevisions = (channelKey: string, id: number) =>
  axios.get<ApiResult<ContentRevision[]>>('/api/mgmt/content/revisions', { params: { channelKey, id } })

/** 历史版本快照详情 */
export const getRevision = (channelKey: string, revisionId: number) =>
  axios.get<ApiResult<RevisionSnapshot>>('/api/mgmt/content/revision', { params: { channelKey, revisionId } })

/** 恢复到某历史版本（当前值会先记成一个新版本） */
export const restoreRevision = (channelKey: string, revisionId: number) =>
  axios.post<ApiResult<Content>>('/api/mgmt/content/revision/restore', { channelKey, revisionId })

// ---------------- 站点信息 ----------------

/** 草稿预览链接：该栏目所在官网页面的路径与 30 分钟预览令牌 */
export interface PreviewLink {
  /** 基本信息里的网址（规整后），未配置时为空串 */
  origin: string
  path: string
  /** 从区块栏目进来时的区块锚点 */
  anchor?: string
  token: string
  expiresAt: number
}

/** 获取草稿预览链接 */
export const getPreviewLink = (channelKey: string) =>
  axios.get<ApiResult<PreviewLink>>('/api/mgmt/content/preview-link', { params: { channelKey } })

/** 获取站点基本信息 */
export const getSiteInfo = () =>
  axios.get<ApiResult<SiteInfo>>('/api/mgmt/site/detail')

/** 保存站点基本信息 */
export const saveSiteInfo = (data: Partial<SiteInfo>) =>
  axios.post<ApiResult<null>>('/api/mgmt/site/save', data)
