// 会员响应 VO —— 脱敏出口
// passwordHash / failedAttempts / lockedUntil 等内部字段一律不进 VO
import type { Member } from '../member.entity'
import type { MemberStatus } from '../../../common/enums'

/** 前台会员自身资料 */
export interface MemberProfileVo {
  id: number
  phone: string
  nickname: string
  email: string | null
  avatar: string | null
  createdAt: Date
}

/** 后台会员列表项，手机号邮箱遮蔽展示 */
export interface MemberListItemVo {
  id: number
  nickname: string
  phoneMasked: string
  emailMasked: string | null
  status: MemberStatus
  lastLoginAt: Date | null
  createdAt: Date
}

/** 后台会员详情，展示完整联系方式 */
export interface MemberDetailVo {
  id: number
  nickname: string
  phone: string
  email: string | null
  avatar: string | null
  status: MemberStatus
  registerIp: string | null
  /** 锁定截止时间；为空表示未锁定。管理端需据此判断是否要解锁 */
  lockedUntil: Date | null
  lastLoginAt: Date | null
  createdAt: Date
}

/** 手机号遮蔽：保留前 3 后 4，中间 4 位替换 */
export function maskPhone(phone: string): string {
  if (phone.length < 7) return '****'
  return `${phone.slice(0, 3)}****${phone.slice(-4)}`
}

/** 邮箱遮蔽：本地部分保留首字符 */
export function maskEmail(email: string | null): string | null {
  if (!email) return null
  const at = email.indexOf('@')
  if (at <= 0) return '****'
  const local = email.slice(0, at)
  const domain = email.slice(at)
  const head = local.slice(0, 1)
  return `${head}${'*'.repeat(Math.max(local.length - 1, 1))}${domain}`
}

/** 实体 → 前台资料 VO */
export function toMemberProfileVo(m: Member): MemberProfileVo {
  return {
    id: m.id,
    phone: m.phone,
    nickname: m.nickname,
    email: m.email,
    avatar: m.avatar,
    createdAt: m.createdAt,
  }
}

/** 实体 → 后台列表 VO（遮蔽） */
export function toMemberListItemVo(m: Member): MemberListItemVo {
  return {
    id: m.id,
    nickname: m.nickname,
    phoneMasked: maskPhone(m.phone),
    emailMasked: maskEmail(m.email),
    status: m.status,
    lastLoginAt: m.lastLoginAt,
    createdAt: m.createdAt,
  }
}

/** 实体 → 后台详情 VO */
export function toMemberDetailVo(m: Member): MemberDetailVo {
  return {
    id: m.id,
    nickname: m.nickname,
    phone: m.phone,
    email: m.email,
    avatar: m.avatar,
    status: m.status,
    registerIp: m.registerIp,
    lockedUntil: m.lockedUntil,
    lastLoginAt: m.lastLoginAt,
    createdAt: m.createdAt,
  }
}
