// 前台导航菜单接口层 —— /api/portal/menu
// 仅含访客可见栏目，后台专用栏目（基本信息/管理员/会员中心等）由后端过滤
import { get } from './request'

/** 导航菜单项 */
export interface MenuNode {
  key: string
  label: string
  path: string
  /** 同页锚点 id（一级栏目无锚点，子项指向页内板块） */
  anchor?: string
  children?: MenuNode[]
}

/** 获取前台导航菜单树（对外栏目） */
export const getMenu = () => get<MenuNode[]>('/api/portal/menu')
