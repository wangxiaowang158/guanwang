// 会员登录日志接口层 —— 走真实后端 /api/mgmt/login-log/*（非 Mock）
// 只读 + 按日期清理，日志由会员登录行为自动写入
import axios from 'axios'
import type { ApiResult } from './auth'
import type { PageResult } from './member'

/** 登录方式 */
export type LoginMethod = 'password' | 'smsCode'

/** 登录方式中文名 */
export const LOGIN_METHOD_LABEL: Record<LoginMethod, string> = {
  password: '密码登录',
  smsCode: '短信登录',
}

/** 登录结果 */
export type LoginResult = 'success' | 'failure'

/** 登录结果中文名 */
export const LOGIN_RESULT_LABEL: Record<LoginResult, string> = {
  success: '成功',
  failure: '失败',
}

/** 失败原因 */
export type LoginFailReason =
  | 'wrongPassword'
  | 'accountNotFound'
  | 'accountDisabled'
  | 'wrongCaptcha'
  | 'accountLocked'

/** 失败原因中文名，仅后台可见（前台统一提示，防账号枚举） */
export const LOGIN_FAIL_REASON_LABEL: Record<LoginFailReason, string> = {
  wrongPassword: '密码错误',
  accountNotFound: '账号不存在',
  accountDisabled: '账号已禁用',
  wrongCaptcha: '图形验证码错误',
  accountLocked: '账号已锁定',
}

/** 登录日志条目 */
export interface LoginLogItem {
  id: number
  memberId: number | null
  /** 会员昵称；会员已删除时为「已删除会员」，匿名失败记录为空 */
  nickname: string | null
  /** 登录时填写的账号（手机号），后台可见完整值 */
  loginAccount: string
  loginMethod: LoginMethod
  loginIp: string | null
  deviceInfo: string | null
  result: LoginResult
  /** 失败原因，仅失败记录有值 */
  failReason: LoginFailReason | null
  createdAt: string
}

/** 登录日志查询参数 */
export interface LoginLogQuery {
  keyword?: string
  result?: LoginResult
  startDate?: string
  endDate?: string
  page?: number
  pageSize?: number
}

/**
 * 获取登录日志列表（支持关键词、结果、日期范围筛选）
 * @param params 查询参数，日期格式 YYYY-MM-DD
 */
export const getLoginLogList = (params: LoginLogQuery) =>
  axios.get<ApiResult<PageResult<LoginLogItem>>>('/api/mgmt/login-log/list', { params })

/**
 * 清理指定日期之前的登录日志
 * @param before 日期，格式 YYYY-MM-DD，该日期之前的记录会被物理删除
 */
export const clearLoginLog = (before: string) =>
  axios.delete<ApiResult<{ count: number } | null>>('/api/mgmt/login-log/clear', {
    params: { before },
  })
