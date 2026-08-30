// 管理员管理接口层 —— 列表/详情/保存/删除；权限为一级菜单勾选
import axios from 'axios'
import type { ApiResult } from './auth'

/** 管理员记录 */
export interface AdminItem {
  id: number
  account: string
  name: string
  perms: string[]
  wechatBound: boolean
  createTime: string
}

/** 保存管理员的表单（新增时含密码） */
export interface AdminForm {
  id?: number
  account: string
  name: string
  password?: string
  perms: string[]
  wechatBound?: boolean
}

/** 获取管理员列表（支持关键字筛选） */
export const getAdminList = (params: { keyword?: string }) =>
  axios.get<ApiResult<AdminItem[]>>('/api/admin/list', { params })

/** 获取管理员详情 */
export const getAdminDetail = (id: number) =>
  axios.get<ApiResult<AdminItem | null>>('/api/admin/detail', { params: { id } })

/** 保存管理员（有 id 为更新，无 id 为新增） */
export const saveAdmin = (data: AdminForm) =>
  axios.post<ApiResult<null>>('/api/admin/save', data)

/** 删除管理员 */
export const deleteAdmin = (id: number) =>
  axios.delete<ApiResult<null>>(`/api/admin/delete?id=${id}`)
