// 反馈请求 DTO —— 内容按纯文本处理，长度上限防超长输入
import { Type } from 'class-transformer'
import {
  IsBoolean, IsEnum, IsInt, IsOptional, IsString, Length, Matches, Min, MaxLength,
} from 'class-validator'
import { FEEDBACK_SOURCE, FEEDBACK_STATUS, FEEDBACK_TYPE } from '../../../common/enums'
import type { FeedbackSource, FeedbackStatus, FeedbackType } from '../../../common/enums'

/** 手机号格式：中国大陆 11 位 */
const PHONE_PATTERN = /^1[3-9]\d{9}$/

/** 匿名咨询提交（沿用原留言入口，无需登录） */
export class SubmitAnonymousFeedbackDto {
  /** 单位名称，选填 */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  company?: string

  /** 联系人姓名 */
  @IsString()
  @Length(1, 50, { message: '请填写姓名' })
  name!: string

  /** 联系电话 */
  @IsString()
  @Matches(PHONE_PATTERN, { message: '手机号格式不正确' })
  phone!: string

  /** 反馈类型 */
  @IsOptional()
  @IsEnum(FEEDBACK_TYPE, { message: '反馈类型不合法' })
  feedbackType?: FeedbackType

  /** 咨询内容 */
  @IsString()
  @Length(1, 2000, { message: '内容长度需在 1 到 2000 字之间' })
  content!: string

  /** 提交来源页面 */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  sourcePage?: string
}

/** 会员提交反馈；身份取自令牌，故不含 memberId 等身份字段 */
export class SubmitMemberFeedbackDto {
  /** 反馈类型 */
  @IsOptional()
  @IsEnum(FEEDBACK_TYPE, { message: '反馈类型不合法' })
  feedbackType?: FeedbackType

  /** 反馈内容 */
  @IsString()
  @Length(1, 2000, { message: '内容长度需在 1 到 2000 字之间' })
  content!: string

  /** 联系电话，选填；不填则沿用账号手机号 */
  @IsOptional()
  @IsString()
  @Matches(PHONE_PATTERN, { message: '手机号格式不正确' })
  phone?: string

  /** 提交来源页面 */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  sourcePage?: string
}

/** 后台反馈查询条件 */
export class FeedbackQueryDto {
  /** 页码，从 1 开始 */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number

  /** 每页条数 */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number

  /** 关键词：匹配单位、姓名、电话、内容 */
  @IsOptional()
  @IsString()
  @MaxLength(50)
  keyword?: string

  /** 按来源筛选 */
  @IsOptional()
  @IsEnum(FEEDBACK_SOURCE, { message: '来源类型不合法' })
  source?: FeedbackSource

  /** 按状态筛选 */
  @IsOptional()
  @IsEnum(FEEDBACK_STATUS, { message: '状态不合法' })
  status?: FeedbackStatus

  /** 按类型筛选 */
  @IsOptional()
  @IsEnum(FEEDBACK_TYPE, { message: '反馈类型不合法' })
  feedbackType?: FeedbackType

  /** 起始日期，格式 YYYY-MM-DD */
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: '起始日期格式应为 YYYY-MM-DD' })
  startDate?: string

  /** 结束日期，格式 YYYY-MM-DD */
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: '结束日期格式应为 YYYY-MM-DD' })
  endDate?: string
}

/** 后台回复反馈 */
export class ReplyFeedbackDto {
  /** 回复内容 */
  @IsString()
  @Length(1, 2000, { message: '回复内容长度需在 1 到 2000 字之间' })
  content!: string

  /** 回复人标识，选填 */
  @IsOptional()
  @IsString()
  @MaxLength(50)
  repliedBy?: string

  /**
   * 是否对会员可见。不传时由服务端按来源自动判定：
   * 会员来源默认可见，匿名来源默认不可见（匿名提交者无账号可查看）。
   */
  @IsOptional()
  @IsBoolean()
  visibleToMember?: boolean
}

/** 后台变更反馈状态 */
export class UpdateFeedbackStatusDto {
  /** 目标状态，须符合 FEEDBACK_STATUS_FLOW 允许的流转 */
  @IsEnum(FEEDBACK_STATUS, { message: '状态不合法' })
  status!: FeedbackStatus
}
