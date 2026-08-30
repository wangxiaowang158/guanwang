// 会员个人中心接口层 —— 走真实后端 /api/portal/member，需携带会员令牌
// 成功码为 200，与既有 Mock 接口的 code:0 不同，勿混用
import { authRequest } from './request'
import type { MemberProfile } from './memberAuth'

/** 读取当前会员资料 */
export const fetchProfile = () =>
  authRequest<MemberProfile>('GET', '/api/portal/member/profile')

/**
 * 更新会员资料
 * @param data 待更新字段，均为选填。昵称限 2-20 字；
 *             avatar 为图片地址（后端限长 500，不能放 base64）
 */
export const updateProfile = (data: {
  nickname?: string
  email?: string
  avatar?: string
}) => authRequest<MemberProfile>('PUT', '/api/portal/member/profile', data)

/** 修改密码；旧密码错误时后端返回 code 400 */
export const changePassword = (data: { oldPassword: string; newPassword: string }) =>
  authRequest<null>('PUT', '/api/portal/member/password', data)
