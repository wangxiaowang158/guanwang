// 前台意见反馈接口层 —— /api/portal/feedback
import { authRequest, post, type ApiResult } from './request'

export type FeedbackType = 'suggestion' | 'complaint' | 'cooperation' | 'other'
export type FeedbackStatus = 'pending' | 'processing' | 'replied' | 'closed'

/** 反馈分类展示文案 */
export const FEEDBACK_TYPE_LABEL: Record<FeedbackType, string> = {
  suggestion: '建议',
  complaint: '投诉',
  cooperation: '合作',
  other: '其他',
}

/** 处理状态展示文案 */
export const FEEDBACK_STATUS_LABEL: Record<FeedbackStatus, string> = {
  pending: '待处理',
  processing: '处理中',
  replied: '已回复',
  closed: '已关闭',
}

/** 回复条目；前台只会收到对会员可见的回复 */
export interface FeedbackReply {
  id: number
  content: string
  repliedBy: string | null
  createdAt: string
}

/** 「我的反馈」列表项 */
export interface MyFeedbackItem {
  id: number
  feedbackType: FeedbackType | null
  content: string
  status: FeedbackStatus
  createdAt: string
  replies: FeedbackReply[]
}

/** 线索类型：预约/咨询入口区分来意，普通留言不传 */
export type LeadType = 'energyAssess' | 'productDemo' | 'channel' | 'consult'

/** 线索类型展示文案（表单下拉与入口按钮共用） */
export const LEAD_TYPE_LABEL: Record<LeadType, string> = {
  consult: '在线咨询',
  energyAssess: '预约测算',
  productDemo: '预约演示',
  channel: '渠道招商',
}

/** 访客提交入参：需自填联系方式 */
export interface AnonymousFeedbackPayload {
  company?: string
  name: string
  phone: string
  feedbackType?: FeedbackType
  /** 线索类型 */
  leadType?: LeadType
  /** 联系邮箱，选填 */
  email?: string
  /** 职位，选填 */
  position?: string
  content: string
  sourcePage?: string
}

/** 会员提交入参：身份取自令牌，无需填姓名 */
export interface MemberFeedbackPayload {
  feedbackType?: FeedbackType
  content: string
  phone?: string
  sourcePage?: string
}

/**
 * 访客匿名提交反馈
 * @param data 联系方式与反馈内容
 */
export const submitAnonymousFeedback = (data: AnonymousFeedbackPayload) =>
  post<null>('/api/portal/feedback/anonymous', data)

/**
 * 会员提交反馈（自动携带会员令牌）
 * @param data 反馈内容，联系方式缺省时后端取会员资料
 */
export const submitMemberFeedback = (data: MemberFeedbackPayload) =>
  authRequest<null>('POST', '/api/portal/feedback/submit', data)

/** 读取当前会员的反馈记录（含对会员可见的回复） */
export const fetchMyFeedback = () =>
  authRequest<MyFeedbackItem[]>('GET', '/api/portal/feedback/mine')

export type { ApiResult }
