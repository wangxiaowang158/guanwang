// 会员认证接口层 —— 走真实后端 /api/portal/auth（非 Mock）
// 成功码为 200，与既有 Mock 接口的 code:0 不同，勿混用
import { get, post, type ApiResult } from './request'

/** 登录方式：密码 / 短信验证码 */
export type LoginMethod = 'password' | 'smsCode'

/** 短信验证码用途 */
export type SmsPurpose = 'register' | 'login' | 'reset'

/** 前台可见的注册登录配置（不含内部风控阈值） */
export interface PortalAuthConfig {
  registerOpen: boolean
  allowPasswordLogin: boolean
  allowSmsLogin: boolean
  passwordMinLength: number
  passwordRequireMixed: boolean
}

/** 图形验证码挑战：question 为算术题面，captchaId 提交时回传 */
export interface CaptchaChallenge {
  captchaId: string
  question: string
}

/** 会员资料 */
export interface MemberProfile {
  id: number
  phone: string
  nickname: string
  email: string | null
  avatar: string | null
  createdAt: string
}

/** 登录/注册成功后的返回 */
export interface AuthSuccess {
  token: string
  profile: MemberProfile
  captchaRequired: boolean
}

/** 登录失败时后端仍返回该结构，用于决定是否显示图形验证码 */
export interface AuthFailure {
  captchaRequired: boolean
}

/** 读取前台注册登录配置 */
export const fetchAuthConfig = () => get<PortalAuthConfig>('/api/portal/auth/config')

/** 获取图形验证码 */
export const fetchCaptcha = () => get<CaptchaChallenge>('/api/portal/auth/captcha')

/**
 * 发送短信验证码
 * @param phone 手机号
 * @param purpose 用途，后端按用途校验号码是否已注册
 */
export const sendSmsCode = (phone: string, purpose: SmsPurpose) =>
  post<null>('/api/portal/auth/sms-code', { phone, purpose })

/** 注册入参；邮箱选填 */
export interface RegisterPayload {
  phone: string
  nickname: string
  password: string
  smsCode: string
  email?: string
}

/** 注册；开放注册关闭时后端返回 code 400 */
export const register = (data: RegisterPayload) =>
  post<AuthSuccess>('/api/portal/auth/register', data)

/**
 * 登录入参
 * method 为 password 时传 password，为 smsCode 时传 smsCode；
 * 失败次数达阈值后后端要求 captcha + captchaId
 */
export interface LoginPayload {
  phone: string
  method: LoginMethod
  password?: string
  smsCode?: string
  captcha?: string
  captchaId?: string
}

/**
 * 登录
 * 凭证错误时后端返回 code 401 且 data 为 { captchaRequired }，
 * 提示文案统一（不区分账号不存在与密码错误），防账号枚举
 */
export const login = (data: LoginPayload) =>
  post<AuthSuccess | AuthFailure>('/api/portal/auth/login', data)

/** 凭短信验证码重置密码；未注册号码同样返回成功，防账号枚举 */
export const resetPassword = (data: { phone: string; smsCode: string; newPassword: string }) =>
  post<null>('/api/portal/auth/reset-password', data)

/** 判断登录响应是否为成功载荷 */
export function isAuthSuccess(data: AuthSuccess | AuthFailure | null): data is AuthSuccess {
  return !!data && typeof (data as AuthSuccess).token === 'string'
}

export type { ApiResult }
