// 管理员管理接口层 —— 走真实后端 /api/mgmt/admin/*（仅超管可访问）
// 权限为一级菜单勾选；密码不随资料更新提交，走独立的重置接口
import axios from 'axios'
import type { ApiResult } from './auth'

/** 管理员记录 */
export interface AdminItem {
  id: number
  account: string
  name: string
  perms: string[]
  /** 超管不受权限清单限制，且不可删除 */
  isSuper: boolean
  wechatBound: boolean
  createTime: string
}

/** 新增管理员入参，密码必填 */
export interface CreateAdminParams {
  account: string
  name: string
  password: string
  perms: string[]
  wechatBound?: boolean
}

/** 更新管理员资料入参，不含账号与密码 */
export interface UpdateAdminParams {
  id: number
  name: string
  perms: string[]
  wechatBound?: boolean
}

/** 获取管理员列表（支持关键字筛选） */
export const getAdminList = (params: { keyword?: string }) =>
  axios.get<ApiResult<AdminItem[]>>('/api/mgmt/admin/list', { params })

/** 获取管理员详情 */
export const getAdminDetail = (id: number) =>
  axios.get<ApiResult<AdminItem | null>>('/api/mgmt/admin/detail', { params: { id } })

/** 新增管理员 */
export const addAdmin = (data: CreateAdminParams) =>
  axios.post<ApiResult<AdminItem>>('/api/mgmt/admin/add', data)

/** 更新管理员资料与权限（超管的权限清单后端不予保存） */
export const updateAdmin = (data: UpdateAdminParams) =>
  axios.put<ApiResult<AdminItem>>('/api/mgmt/admin/update', data)

/** 重置指定管理员的密码（不少于 8 位） */
export const resetAdminPassword = (id: number, password: string) =>
  axios.put<ApiResult<null>>('/api/mgmt/admin/reset-password', { id, password })

/** 删除管理员（超管与当前登录账号不可删除） */
export const deleteAdmin = (id: number) =>
  axios.delete<ApiResult<null>>(`/api/mgmt/admin/delete?id=${id}`)
