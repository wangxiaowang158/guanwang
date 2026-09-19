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
  /** 前台路由路径，如 /hvac；为空表示该栏目不进前台。管理端只读不改 */
  portalPath?: string
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
export type BlockLayout = 'cards' | 'list' | 'tags' | 'steps' | 'rich' | 'video'

/** 展示形态下拉选项 */
export const BLOCK_LAYOUT_OPTIONS: { label: string; value: BlockLayout }[] = [
  { label: '图标卡片', value: 'cards' },
  { label: '横向列表', value: 'list' },
  { label: '标签云', value: 'tags' },
  { label: '编号流程', value: 'steps' },
  { label: '图文段落', value: 'rich' },
  { label: '视频', value: 'video' },
]

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
  createTime?: string
  updateTime?: string
}

/** 站点基本信息（单例） */
export interface SiteInfo {
  webTitle: string
  keywords: string
  description: string
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

/** 删除栏目（级联删除子节点） */
export const deleteChannel = (id: number) =>
  axios.delete<ApiResult<null>>(`/api/mgmt/channel/delete?id=${id}`)

// ---------------- 内容 ----------------

/** 获取某栏目内容列表（支持关键字、日期筛选） */
export const getContentList = (params: {
  channelKey: string
  keyword?: string
  startDate?: string
  endDate?: string
}) => axios.get<ApiResult<Content[]>>('/api/mgmt/content/list', { params })

/** 获取单条内容详情 */
export const getContentDetail = (params: { channelKey: string; id?: number }) =>
  axios.get<ApiResult<Content | null>>('/api/mgmt/content/detail', { params })

/** 保存内容（有 id 为更新，无 id 为新增） */
export const saveContent = (data: Partial<Content> & { channelKey: string }) =>
  axios.post<ApiResult<null>>('/api/mgmt/content/save', data)

/** 删除内容（支持批量，ids 逗号分隔） */
export const deleteContent = (channelKey: string, ids: (number | string)[]) =>
  axios.delete<ApiResult<null>>(
    `/api/mgmt/content/delete?channelKey=${encodeURIComponent(channelKey)}&ids=${ids.join(',')}`
  )

/** 切换置顶 */
export const toggleContentTop = (channelKey: string, id: number) =>
  axios.put<ApiResult<null>>('/api/mgmt/content/top', { channelKey, id })

/** 修改排序值 */
export const updateContentSort = (channelKey: string, id: number, sort: number) =>
  axios.put<ApiResult<null>>('/api/mgmt/content/sort', { channelKey, id, sort })

// ---------------- 站点信息 ----------------

/** 获取站点基本信息 */
export const getSiteInfo = () =>
  axios.get<ApiResult<SiteInfo>>('/api/mgmt/site/detail')

/** 保存站点基本信息 */
export const saveSiteInfo = (data: Partial<SiteInfo>) =>
  axios.post<ApiResult<null>>('/api/mgmt/site/save', data)
