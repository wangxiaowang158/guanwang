// 管理员管理接口层 —— 走真实后端 /api/mgmt/admin/*（仅超管可访问）
// 权限为一级菜单勾选；密码不随资料更新提交，走独立的重置接口
import axios from 'axios'
import type { ApiResult } from './auth'

/** 管理员记录 */
export interface AdminItem {
  id: number
  account: string
  name: string
  /** 账号单独勾选的权限（不含角色带来的） */
  perms: string[]
  /** 所属角色 id，null 为不套角色 */
  roleId: number | null
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
  roleId?: number | null
  wechatBound?: boolean
}

/** 更新管理员资料入参，不含账号与密码 */
export interface UpdateAdminParams {
  id: number
  name: string
  perms: string[]
  /** 传 null 表示取消角色 */
  roleId?: number | null
  wechatBound?: boolean
}

/** 角色：一组可复用的菜单权限；账号最终权限 = 角色权限 ∪ 账号单独勾选的权限 */
export interface AdminRole {
  id: number
  name: string
  perms: string[]
  remark: string
  /** 使用该角色的账号数 */
  adminCount: number
}

/** 管理员列表分页结果 */
export interface AdminListResult {
  list: AdminItem[]
  total: number
  page: number
  pageSize: number
}

/** 获取管理员列表（支持关键字筛选，分页由后端完成） */
export const getAdminList = (params: { keyword?: string; page?: number; pageSize?: number }) =>
  axios.get<ApiResult<AdminListResult>>('/api/mgmt/admin/list', { params })

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

/** 角色列表（附使用账号数） */
export const getRoles = () => axios.get<ApiResult<AdminRole[]>>('/api/mgmt/admin/roles')

/** 新增 / 修改角色；修改后使用该角色的账号立即按新权限生效 */
export const saveRole = (data: { id?: number; name: string; perms: string[]; remark?: string }) =>
  axios.post<ApiResult<Omit<AdminRole, 'adminCount'>>>('/api/mgmt/admin/role/save', data)

/** 删除角色（仍有账号在用时后端拒绝） */
export const deleteRole = (id: number) =>
  axios.delete<ApiResult<null>>('/api/mgmt/admin/role/delete', { params: { id } })

/** 删除管理员（超管与当前登录账号不可删除） */
export const deleteAdmin = (id: number) =>
  axios.delete<ApiResult<null>>(`/api/mgmt/admin/delete?id=${id}`)
