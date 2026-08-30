// 会员管理接口层 —— 走真实后端 /api/mgmt/member/*（非 Mock）
// 会员由前台注册产生，后台只做查询、启用禁用、解锁、重置密码、删除
import axios from 'axios'
import type { ApiResult } from './auth'

/** 会员状态：正常 / 已禁用。风控锁定不占状态位，由 lockedUntil 表达 */
export type MemberStatus = 'normal' | 'disabled'

/** 会员状态中文名 */
export const MEMBER_STATUS_LABEL: Record<MemberStatus, string> = {
  normal: '正常',
  disabled: '已禁用',
}

/** 会员状态对应的标签颜色 */
export const MEMBER_STATUS_COLOR: Record<MemberStatus, string> = {
  normal: 'green',
  disabled: 'default',
}

/** 会员列表项，联系方式已遮蔽 */
export interface MemberListItem {
  id: number
  phoneMasked: string
  nickname: string
  emailMasked: string | null
  status: MemberStatus
  lastLoginAt: string | null
  createdAt: string
}

/** 会员详情，含完整联系方式与锁定截止时间 */
export interface MemberDetail {
  id: number
  nickname: string
  phone: string
  email: string | null
  avatar: string | null
  status: MemberStatus
  registerIp: string | null
  /** 锁定截止时间；为空或已过期表示未锁定 */
  lockedUntil: string | null
  lastLoginAt: string | null
  createdAt: string
}

/**
 * 判断会员当前是否处于风控锁定中
 * @param lockedUntil 锁定截止时间，来自会员详情
 */
export function isLocked(lockedUntil: string | null): boolean {
  if (!lockedUntil) return false
  const until = new Date(lockedUntil).getTime()
  return Number.isFinite(until) && until > Date.now()
}

/** 分页结果 */
export interface PageResult<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
}

/** 会员列表查询参数 */
export interface MemberQuery {
  keyword?: string
  status?: MemberStatus
  startDate?: string
  endDate?: string
  page?: number
  pageSize?: number
}

/**
 * 获取会员列表（支持关键词、状态、注册日期范围筛选）
 * @param params 查询参数，日期格式 YYYY-MM-DD
 */
export const getMemberList = (params: MemberQuery) =>
  axios.get<ApiResult<PageResult<MemberListItem>>>('/api/mgmt/member/list', { params })

/**
 * 获取会员详情（含完整联系方式）
 * @param id 会员 id
 */
export const getMemberDetail = (id: number) =>
  axios.get<ApiResult<MemberDetail | null>>(`/api/mgmt/member/detail/${id}`)

/**
 * 修改会员状态
 * @param id 会员 id
 * @param status 目标状态；置为 normal 时后端会同步清除锁定与失败计数（即解锁）
 */
export const updateMemberStatus = (id: number, status: MemberStatus) =>
  axios.put<ApiResult<null>>(`/api/mgmt/member/status/${id}`, { status })

/**
 * 重置会员密码为指定值
 * @param id 会员 id
 * @param newPassword 新密码，长度 6-64
 */
export const resetMemberPassword = (id: number, newPassword: string) =>
  axios.put<ApiResult<null>>(`/api/mgmt/member/reset-password/${id}`, { newPassword })

/**
 * 删除会员（后端为软删除，登录日志与已提交反馈均保留）
 * @param id 会员 id
 */
export const deleteMember = (id: number) =>
  axios.delete<ApiResult<null>>(`/api/mgmt/member/delete/${id}`)
