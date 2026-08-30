// 注册登录配置接口层 —— 走真实后端 /api/mgmt/auth-config（非 Mock）
// 后端为持久化单例，读写整份配置，无新增与删除
import axios from 'axios'
import type { ApiResult } from './auth'

/** 注册登录配置 */
export interface AuthConfig {
  /** 是否开放注册；关闭后前台注册接口直接拒绝 */
  registerOpen: boolean
  /** 是否允许密码登录 */
  allowPasswordLogin: boolean
  /** 是否允许短信验证码登录 */
  allowSmsLogin: boolean
  /** 密码最小长度 */
  passwordMinLength: number
  /** 密码是否必须包含字母与数字 */
  passwordRequireMixed: boolean
  /** 连续失败达到此次数后要求图形验证码 */
  captchaThreshold: number
  /** 连续失败达到此次数后锁定账号，上限 20 */
  lockThreshold: number
  /** 锁定持续分钟数 */
  lockMinutes: number
}

/** 获取注册登录配置 */
export const getAuthConfig = () => axios.get<ApiResult<AuthConfig>>('/api/mgmt/auth-config')

/**
 * 更新注册登录配置（按字段局部更新）
 * @param data 待更新字段；lockThreshold 上限 20，超出会被后端拒绝
 */
export const updateAuthConfig = (data: Partial<AuthConfig>) =>
  axios.put<ApiResult<AuthConfig | null>>('/api/mgmt/auth-config', data)
