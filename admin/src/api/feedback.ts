// 意见反馈接口层 —— 走真实后端 /api/mgmt/feedback/*（非 Mock）
// 一张表两种来源：anonymous 为前台访客咨询（原留言），member 为登录会员反馈
import axios from 'axios'
import type { ApiResult } from './auth'
import type { PageResult } from './member'

/** 反馈来源 */
export type FeedbackSource = 'anonymous' | 'member'

/** 反馈来源中文名 */
export const FEEDBACK_SOURCE_LABEL: Record<FeedbackSource, string> = {
  anonymous: '访客咨询',
  member: '会员反馈',
}

/** 反馈分类 */
export type FeedbackType = 'suggestion' | 'complaint' | 'cooperation' | 'other'

/** 反馈分类中文名 */
export const FEEDBACK_TYPE_LABEL: Record<FeedbackType, string> = {
  suggestion: '产品建议',
  complaint: '服务投诉',
  cooperation: '合作咨询',
  other: '其他',
}

/** 处理状态 */
export type FeedbackStatus = 'pending' | 'processing' | 'replied' | 'closed'

/** 处理状态中文名 */
export const FEEDBACK_STATUS_LABEL: Record<FeedbackStatus, string> = {
  pending: '待处理',
  processing: '处理中',
  replied: '已回复',
  closed: '已关闭',
}

/** 处理状态对应的标签颜色 */
export const FEEDBACK_STATUS_COLOR: Record<FeedbackStatus, string> = {
  pending: 'red',
  processing: 'blue',
  replied: 'green',
  closed: 'default',
}

/** 状态流转白名单，须与后端 FEEDBACK_STATUS_FLOW 一致；已关闭为终态 */
export const FEEDBACK_STATUS_FLOW: Record<FeedbackStatus, FeedbackStatus[]> = {
  pending: ['processing', 'replied', 'closed'],
  processing: ['replied', 'closed'],
  replied: ['closed'],
  closed: [],
}

/** 回复条目 */
export interface FeedbackReply {
  id: number
  content: string
  repliedBy: string | null
  visibleToMember: boolean
  createdAt: string
}

/** 反馈列表项，联系方式已遮蔽 */
export interface FeedbackListItem {
  id: number
  source: FeedbackSource
  memberId: number | null
  company: string | null
  name: string
  phoneMasked: string | null
  feedbackType: FeedbackType | null
  content: string
  status: FeedbackStatus
  sourcePage: string | null
  replyCount: number
  createdAt: string
}

/** 反馈详情，含完整联系方式、提交 IP 与全部回复（含仅后台留痕的） */
export interface FeedbackDetail {
  id: number
  source: FeedbackSource
  memberId: number | null
  memberNickname: string | null
  company: string | null
  name: string
  phone: string | null
  feedbackType: FeedbackType | null
  content: string
  status: FeedbackStatus
  submitIp: string | null
  sourcePage: string | null
  createdAt: string
  updatedAt: string
  replies: FeedbackReply[]
}

/** 反馈列表查询参数 */
export interface FeedbackQuery {
  keyword?: string
  source?: FeedbackSource
  status?: FeedbackStatus
  feedbackType?: FeedbackType
  startDate?: string
  endDate?: string
  page?: number
  pageSize?: number
}

/**
 * 获取反馈列表（支持关键词、来源、状态、分类、提交日期范围筛选）
 * @param params 查询参数，日期格式 YYYY-MM-DD
 */
export const getFeedbackList = (params: FeedbackQuery) =>
  axios.get<ApiResult<PageResult<FeedbackListItem>>>('/api/mgmt/feedback/list', { params })

/**
 * 获取反馈详情
 * @param id 反馈 id
 */
export const getFeedbackDetail = (id: number) =>
  axios.get<ApiResult<FeedbackDetail | null>>(`/api/mgmt/feedback/detail/${id}`)

/**
 * 回复反馈，回复后状态自动推进为已回复
 * @param id 反馈 id
 * @param data 回复内容、回复人、是否对会员可见（不传时按来源自动判定）
 */
export const replyFeedback = (
  id: number,
  data: { content: string; repliedBy?: string; visibleToMember?: boolean },
) => axios.post<ApiResult<{ replyId: number } | null>>(`/api/mgmt/feedback/reply/${id}`, data)

/**
 * 变更反馈状态，须符合流转白名单
 * @param id 反馈 id
 * @param status 目标状态
 */
export const updateFeedbackStatus = (id: number, status: FeedbackStatus) =>
  axios.put<ApiResult<null>>(`/api/mgmt/feedback/status/${id}`, { status })

/**
 * 删除单条反馈（物理删除，连带清除其回复）
 * @param id 反馈 id
 */
export const deleteFeedback = (id: number) =>
  axios.delete<ApiResult<null>>(`/api/mgmt/feedback/delete/${id}`)

/**
 * 批量删除反馈
 * @param ids 反馈 id 列表
 */
export const batchDeleteFeedback = (ids: number[]) =>
  axios.delete<ApiResult<{ removed: number } | null>>('/api/mgmt/feedback/batch', {
    params: { ids: ids.join(',') },
  })
