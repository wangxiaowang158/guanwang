// 业务枚举定义 —— 对应设计方案 6.3 节
// 存储上统一用 varchar 而非数据库 enum 类型：SQLite 不支持 enum，
// 用 varchar + TS 联合类型可保证 SQLite 与 MySQL 行为一致（切库无需改实体）

/** 会员账号状态 */
export const MEMBER_STATUS = {
  NORMAL: 'normal',
  DISABLED: 'disabled',
} as const
export type MemberStatus = (typeof MEMBER_STATUS)[keyof typeof MEMBER_STATUS]

/** 反馈来源类型 */
export const FEEDBACK_SOURCE = {
  /** 匿名咨询：沿用原留言入口，无需登录 */
  ANONYMOUS: 'anonymous',
  /** 会员反馈：登录后提交，回复对会员可见 */
  MEMBER: 'member',
} as const
export type FeedbackSource = (typeof FEEDBACK_SOURCE)[keyof typeof FEEDBACK_SOURCE]

/** 反馈处理状态 */
export const FEEDBACK_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  REPLIED: 'replied',
  CLOSED: 'closed',
} as const
export type FeedbackStatus = (typeof FEEDBACK_STATUS)[keyof typeof FEEDBACK_STATUS]

/** 状态流转白名单：仅允许正向流转，已关闭为终态 */
export const FEEDBACK_STATUS_FLOW: Record<FeedbackStatus, FeedbackStatus[]> = {
  [FEEDBACK_STATUS.PENDING]: [FEEDBACK_STATUS.PROCESSING, FEEDBACK_STATUS.REPLIED, FEEDBACK_STATUS.CLOSED],
  [FEEDBACK_STATUS.PROCESSING]: [FEEDBACK_STATUS.REPLIED, FEEDBACK_STATUS.CLOSED],
  [FEEDBACK_STATUS.REPLIED]: [FEEDBACK_STATUS.CLOSED],
  [FEEDBACK_STATUS.CLOSED]: [],
}

/** 反馈类型（业务待最终确认，见设计方案 12.3） */
export const FEEDBACK_TYPE = {
  SUGGESTION: 'suggestion',
  COMPLAINT: 'complaint',
  COOPERATION: 'cooperation',
  OTHER: 'other',
} as const
export type FeedbackType = (typeof FEEDBACK_TYPE)[keyof typeof FEEDBACK_TYPE]

/** 登录方式 */
export const LOGIN_METHOD = {
  PASSWORD: 'password',
  SMS_CODE: 'smsCode',
} as const
export type LoginMethod = (typeof LOGIN_METHOD)[keyof typeof LOGIN_METHOD]

/** 登录结果 */
export const LOGIN_RESULT = {
  SUCCESS: 'success',
  FAILURE: 'failure',
} as const
export type LoginResult = (typeof LOGIN_RESULT)[keyof typeof LOGIN_RESULT]

/** 登录失败原因（仅后台可见，前台响应统一模糊提示） */
export const LOGIN_FAIL_REASON = {
  WRONG_PASSWORD: 'wrongPassword',
  ACCOUNT_NOT_FOUND: 'accountNotFound',
  ACCOUNT_DISABLED: 'accountDisabled',
  WRONG_CAPTCHA: 'wrongCaptcha',
  ACCOUNT_LOCKED: 'accountLocked',
} as const
export type LoginFailReason = (typeof LOGIN_FAIL_REASON)[keyof typeof LOGIN_FAIL_REASON]
