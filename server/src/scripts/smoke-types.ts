// 冒烟脚本共用的响应类型 —— 只覆盖各脚本断言实际读取的字段
// 冒烟脚本直连 HTTP，响应体未经编译期约束：字段按「期望存在」声明，实际缺失时由断言在运行时判失败

/** 列表中的单条记录（反馈、登录日志、回复等） */
export interface SmokeItem {
  id: number
  status: string
  source: string
  content: string
  phone: string
  phoneMasked: string
  submitIp: string
  failReason: string
  name: string
  visibleToMember: boolean
  replies: SmokeItem[]
}

/** 统一响应体中 data 的形态：对象、列表分页或数组 */
export interface SmokeData {
  id: number
  total: number
  list: SmokeItem[]
  token: string
  phone: string
  status: string
  memberNickname: string
  captchaId: string
  captchaRequired: boolean
  passwordMinLength: number
  registerOpen: boolean
  removed: number
  tables: string[]
  replies: SmokeItem[]
  length: number
  [index: number]: SmokeItem
}

/** 统一响应体 */
export interface SmokeResponse {
  code: number
  message: string
  data: SmokeData
}
