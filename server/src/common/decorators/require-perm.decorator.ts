// 权限声明装饰器 —— 标注某控制器/方法需要哪个一级菜单权限
// 取值必须与 admin 端 constants/menu.ts 的固定菜单名、
// 或栏目管理里顶层栏目的名称一致，否则永远校验不通过。
import { SetMetadata } from '@nestjs/common'

/** 元数据键名 */
export const PERM_KEY = 'requiredPerm'

/** 已定义的一级菜单权限名常量，避免各控制器散落字面量写错 */
export const PERM = {
  DASHBOARD: '数据仪表盘',
  VISIT_STATS: '访问统计',
  CHANNEL_MANAGE: '栏目管理',
  MEMBER_CENTER: '会员中心',
} as const

/**
 * 声明访问该接口所需的菜单权限
 * @param perm 一级菜单名，如「会员中心」
 */
export const RequirePerm = (perm: string) => SetMetadata(PERM_KEY, perm)
