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
  /** 超级菜单分组名：子项带该字段时下拉按分组多列展示，缺省为单列（后端待补） */
  group?: string
  /** 子项一句话说明，仅分组展示时显示（后端待补） */
  desc?: string
  /** 子项图标地址或图标标识（后端待补） */
  icon?: string
  children?: MenuNode[]
}

/** 获取前台导航菜单树（对外栏目） */
export const getMenu = () => get<MenuNode[]>('/api/portal/menu')
