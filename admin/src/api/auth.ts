// 后台登录认证接口（F01）—— 走真实后端 /api/mgmt/auth/*
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

/** 当前登录管理员的身份与权限，前端据此渲染菜单 */
export interface AdminProfile {
  id: number
  account: string
  name: string
  /** 已授权的一级菜单名；超管为空数组，全部权限由 isSuper 表达 */
  perms: string[]
  isSuper: boolean
}

/** 登录成功返回的数据 */
export interface LoginResponse {
  token: string
  username: string
  profile: AdminProfile
}

/**
 * 管理员登录
 * @param data 用户名与密码
 * @returns 令牌、账号与身份权限；凭证错误返回 code:401
 */
export const login = (data: LoginParams) => {
  return axios.post<ApiResult<LoginResponse | null>>('/api/mgmt/auth/login', data)
}

/**
 * 退出登录
 * 令牌为无状态 JWT，服务端不维护会话，实际由前端清除本地凭证
 * @returns 统一响应结构
 */
export const logout = () => {
  return axios.post<ApiResult<null>>('/api/mgmt/auth/logout')
}

/**
 * 读取当前登录管理员身份与权限
 * 刷新页面后重建权限状态用，令牌失效时返回 code:401
 */
export const getProfile = () => {
  return axios.get<ApiResult<AdminProfile | null>>('/api/mgmt/auth/profile')
}

/**
 * 修改当前管理员自己的密码
 * @param data 原密码与新密码（新密码不少于 8 位）
 * @returns 原密码错误等业务失败返回 code:400
 */
export const changeOwnPassword = (data: { oldPassword: string; newPassword: string }) => {
  return axios.put<ApiResult<null>>('/api/mgmt/auth/password', data)
}
