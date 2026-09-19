// 管理员响应 VO —— 脱敏出口，passwordHash 绝不出现在返回值里
import type { Admin } from '../admin.entity'

/** 后台列表与详情展示用的管理员信息 */
export interface AdminVo {
  id: number
  account: string
  name: string
  /** 已授权的一级菜单名；超管返回空数组，由 isSuper 表达「全部权限」 */
  perms: string[]
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
    isSuper: a.isSuper,
    wechatBound: a.wechatBound,
    createTime: a.createdAt?.toISOString() ?? '',
  }
}

/** 实体转当前登录身份 VO */
export function toAdminProfileVo(a: Admin): AdminProfileVo {
  return {
    id: a.id,
    account: a.account,
    name: a.name,
    perms: parsePerms(a.perms),
    isSuper: a.isSuper,
  }
}
