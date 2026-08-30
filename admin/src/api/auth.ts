// 后台登录认证接口（F01）
import axios from 'axios'

/** 统一响应结构，code:200 表成功 */
export interface ApiResult<T = unknown> {
  code: number
  message: string
  data: T
}

/** 登录请求参数 */
export interface LoginParams {
  username: string
  password: string
}

/** 登录成功返回的数据 */
export interface LoginResponse {
  token: string
  username: string
}

/**
 * 管理员登录
 * @param data 用户名与密码
 * @returns 登录凭证 token 与用户名；失败返回 code:401
 */
export const login = (data: LoginParams) => {
  return axios.post<ApiResult<LoginResponse>>('/api/login', data)
}

/**
 * 退出登录，清除服务端会话
 * @returns 统一响应结构
 */
export const logout = () => {
  return axios.post<ApiResult<null>>('/api/logout')
}
