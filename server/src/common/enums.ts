// 业务枚举定义 —— 对应设计方案 6.3 节
// 存储上统一用 varchar 而非数据库 enum 类型：SQLite 不支持 enum，
// 用 varchar + TS 联合类型可保证 SQLite 与 MySQL 行为一致（切库无需改实体）

/** 会员账号状态 */
export const MEMBER_STATUS = {
  NORMAL: 'normal',
  DISABLED: 'disabled',
} as const
export type MemberStatus = (typeof MEMBER_STATUS)[keyof typeof MEMBER_STATUS]

/** 内容发布状态：草稿只在后台可见，前台一律只读已发布 */
export const CONTENT_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
} as const
export type ContentStatus = (typeof CONTENT_STATUS)[keyof typeof CONTENT_STATUS]

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

/** 线索类型：官网预约/咨询入口，与 feedbackType 并存（feedbackType 保持原有口径） */
export const LEAD_TYPE = {
  /** 项目节能测算预约 */
  ENERGY_ASSESS: 'energyAssess',
  /** 产品演示预约 */
  PRODUCT_DEMO: 'productDemo',
  /** 渠道招商咨询 */
  CHANNEL: 'channel',
  /** 方案/合作咨询 */
  CONSULT: 'consult',
} as const
export type LeadType = (typeof LEAD_TYPE)[keyof typeof LEAD_TYPE]

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

/** 管理端操作结果：与登录日志分开定义，两者语义独立、日后可各自扩展取值 */
export const OP_LOG_RESULT = {
  SUCCESS: 'success',
  FAILURE: 'failure',
} as const
export type OpLogResult = (typeof OP_LOG_RESULT)[keyof typeof OP_LOG_RESULT]

/** 登录失败原因（仅后台可见，前台响应统一模糊提示） */
export const LOGIN_FAIL_REASON = {
  WRONG_PASSWORD: 'wrongPassword',
  ACCOUNT_NOT_FOUND: 'accountNotFound',
  ACCOUNT_DISABLED: 'accountDisabled',
  WRONG_CAPTCHA: 'wrongCaptcha',
  ACCOUNT_LOCKED: 'accountLocked',
} as const
export type LoginFailReason = (typeof LOGIN_FAIL_REASON)[keyof typeof LOGIN_FAIL_REASON]

/**
 * 栏目类型：
 * 前四项为内容型（管理端渲染通用增删改查界面），后五项为功能型（各自有专用页面）
 */
export const CHANNEL_TYPE = {
  GROUP: 'group',
  LIST: 'list',
  SINGLE: 'single',
  SITECONFIG: 'siteconfig',
  ADMINS: 'admins',
  MEMBERS: 'members',
  FEEDBACK: 'feedback',
  AUTHCONFIG: 'authconfig',
  LOGINLOG: 'loginlog',
  OPLOG: 'oplog',
} as const
export type ChannelType = (typeof CHANNEL_TYPE)[keyof typeof CHANNEL_TYPE]

/** 前台区块展示形态 */
export const BLOCK_LAYOUT = {
  CARDS: 'cards',
  LIST: 'list',
  TAGS: 'tags',
  STEPS: 'steps',
  RICH: 'rich',
  VIDEO: 'video',
  /** 痛点 → 解决方案 → 价值，数据取自条目 extra.pains */
  PAINS: 'pains',
  /** 全链条流程，数据取自条目 extra.steps */
  FLOW: 'flow',
  /** 量化价值看板，数据取自条目 extra.metrics */
  METRICS: 'metrics',
  /** 合作模式，数据取自条目 extra.modes */
  MODES: 'modes',
  /** 客户证言，数据取自条目 extra.quote */
  QUOTE: 'quote',
  /** 图集，数据取自条目 extra.gallery */
  GALLERY: 'gallery',
} as const
export type BlockLayout = (typeof BLOCK_LAYOUT)[keyof typeof BLOCK_LAYOUT]
