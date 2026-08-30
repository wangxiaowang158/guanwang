// 反馈响应 VO —— 区分前台会员视角与后台管理视角
// 前台只看得到 visibleToMember 为真的回复；submitIp 等运维字段不出前台
import type { Feedback } from '../feedback.entity'
import type { FeedbackReply } from '../feedback-reply.entity'
import type { FeedbackSource, FeedbackStatus, FeedbackType } from '../../../common/enums'
import { maskPhone } from '../../member/vo/member.vo'

/** 回复条目（前台与后台共用，后台额外可见回复人） */
export interface FeedbackReplyVo {
  id: number
  content: string
  repliedBy: string | null
  createdAt: Date
}

/** 前台「我的反馈」列表项，含对会员可见的回复 */
export interface MemberFeedbackVo {
  id: number
  feedbackType: FeedbackType | null
  content: string
  status: FeedbackStatus
  createdAt: Date
  replies: FeedbackReplyVo[]
}

/** 后台反馈列表项，手机号遮蔽展示 */
export interface FeedbackListItemVo {
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
  createdAt: Date
}

/** 后台反馈详情，展示完整联系方式与全部回复 */
export interface FeedbackDetailVo {
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
  createdAt: Date
  updatedAt: Date
  replies: (FeedbackReplyVo & { visibleToMember: boolean })[]
}

/** 实体 → 回复 VO */
export function toReplyVo(r: FeedbackReply): FeedbackReplyVo {
  return { id: r.id, content: r.content, repliedBy: r.repliedBy, createdAt: r.createdAt }
}

/** 实体 → 前台「我的反馈」VO；仅保留对会员可见的回复 */
export function toMemberFeedbackVo(f: Feedback, replies: FeedbackReply[]): MemberFeedbackVo {
  return {
    id: f.id,
    feedbackType: f.feedbackType,
    content: f.content,
    status: f.status,
    createdAt: f.createdAt,
    replies: replies.filter((r) => r.visibleToMember).map(toReplyVo),
  }
}

/** 实体 → 后台列表 VO（手机号遮蔽） */
export function toFeedbackListItemVo(f: Feedback, replyCount: number): FeedbackListItemVo {
  return {
    id: f.id,
    source: f.source,
    memberId: f.memberId,
    company: f.company,
    name: f.name,
    phoneMasked: f.phone ? maskPhone(f.phone) : null,
    feedbackType: f.feedbackType,
    content: f.content,
    status: f.status,
    sourcePage: f.sourcePage,
    replyCount,
    createdAt: f.createdAt,
  }
}

/** 实体 → 后台详情 VO */
export function toFeedbackDetailVo(
  f: Feedback,
  replies: FeedbackReply[],
  memberNickname: string | null,
): FeedbackDetailVo {
  return {
    id: f.id,
    source: f.source,
    memberId: f.memberId,
    memberNickname,
    company: f.company,
    name: f.name,
    phone: f.phone,
    feedbackType: f.feedbackType,
    content: f.content,
    status: f.status,
    submitIp: f.submitIp,
    sourcePage: f.sourcePage,
    createdAt: f.createdAt,
    updatedAt: f.updatedAt,
    replies: replies.map((r) => ({ ...toReplyVo(r), visibleToMember: r.visibleToMember })),
  }
}
