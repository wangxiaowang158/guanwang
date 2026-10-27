// 管理员响应 VO —— 脱敏出口，passwordHash 绝不出现在返回值里
import type { Admin } from '../admin.entity'

/** 后台列表与详情展示用的管理员信息 */
export interface AdminVo {
  id: number
  account: string
  name: string
  /** 账号单独勾选的一级菜单名（不含角色带来的）；超管返回空数组，由 isSuper 表达「全部权限」 */
  perms: string[]
  /** 所属角色 id，null 为不套角色 */
  roleId: number | null
  isSuper: boolean
  wechatBound: boolean
  createTime: string
}

/** 当前登录管理员的身份信息，供前端渲染菜单与权限判断 */
export interface AdminProfileVo {
  id: number
  account: string
  name: string
  perms: string[]
  isSuper: boolean
}

/** 解析 perms JSON 字段；非法内容按空数组处理，避免脏数据导致接口 500 */
export function parsePerms(raw: string | null): string[] {
  if (!raw) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((p): p is string => typeof p === 'string') : []
  } catch {
    return []
  }
}

/** 实体转列表/详情 VO */
export function toAdminVo(a: Admin): AdminVo {
  return {
    id: a.id,
    account: a.account,
    name: a.name,
    perms: parsePerms(a.perms),
    roleId: a.roleId ?? null,
    isSuper: a.isSuper,
    wechatBound: a.wechatBound,
    createTime: a.createdAt?.toISOString() ?? '',
  }
}

/**
 * 实体转当前登录身份 VO
 * @param perms 最终权限（含角色带来的），由 AdminService.effectivePerms 算出
 */
export function toAdminProfileVo(a: Admin, perms: string[]): AdminProfileVo {
  return {
    id: a.id,
    account: a.account,
    name: a.name,
    perms,
    isSuper: a.isSuper,
  }
}
