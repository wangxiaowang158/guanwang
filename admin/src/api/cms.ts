// CMS 接口层 —— 栏目(channel) / 内容(content) / 站点信息(site)
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
  // 栏目页 SEO 元信息（TDK）—— 仅顶级板块页使用
  seoTitle?: string
  seoKeywords?: string
  seoDescription?: string
  updateTime?: string
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
  phone: string
  website: string
  recruitEmail: string
  contactEmail: string
  address: string
  mapLng: string
  mapLat: string
  mapLink: string
  copyright: string
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
  axios.get<ApiResult<Channel[]>>('/api/channel/list')

/** 按 key 或 id 获取单个栏目配置 */
export const getChannelDetail = (params: { key?: string; id?: number }) =>
  axios.get<ApiResult<Channel>>('/api/channel/detail', { params })

/** 新增栏目 */
export const addChannel = (data: Partial<Channel>) =>
  axios.post<ApiResult<Channel>>('/api/channel/add', data)

/** 更新栏目 */
export const updateChannel = (data: Partial<Channel> & { id: number }) =>
  axios.put<ApiResult<null>>('/api/channel/update', data)

/** 删除栏目（级联删除子节点） */
export const deleteChannel = (id: number) =>
  axios.delete<ApiResult<null>>(`/api/channel/delete?id=${id}`)

// ---------------- 内容 ----------------

/** 获取某栏目内容列表（支持关键字、日期筛选） */
export const getContentList = (params: {
  channelKey: string
  keyword?: string
  startDate?: string
  endDate?: string
}) => axios.get<ApiResult<Content[]>>('/api/content/list', { params })

/** 获取单条内容详情 */
export const getContentDetail = (params: { channelKey: string; id?: number }) =>
  axios.get<ApiResult<Content | null>>('/api/content/detail', { params })

/** 保存内容（有 id 为更新，无 id 为新增） */
export const saveContent = (data: Partial<Content> & { channelKey: string }) =>
  axios.post<ApiResult<null>>('/api/content/save', data)

/** 删除内容（支持批量，ids 逗号分隔） */
export const deleteContent = (channelKey: string, ids: (number | string)[]) =>
  axios.delete<ApiResult<null>>(
    `/api/content/delete?channelKey=${channelKey}&ids=${ids.join(',')}`
  )

/** 切换置顶 */
export const toggleContentTop = (channelKey: string, id: number) =>
  axios.put<ApiResult<null>>('/api/content/top', { channelKey, id })

/** 修改排序值 */
export const updateContentSort = (channelKey: string, id: number, sort: number) =>
  axios.put<ApiResult<null>>('/api/content/sort', { channelKey, id, sort })

// ---------------- 站点信息 ----------------

/** 获取站点基本信息 */
export const getSiteInfo = () =>
  axios.get<ApiResult<SiteInfo>>('/api/site/detail')

/** 保存站点基本信息 */
export const saveSiteInfo = (data: Partial<SiteInfo>) =>
  axios.post<ApiResult<null>>('/api/site/save', data)
