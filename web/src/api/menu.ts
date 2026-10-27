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
  /** 超级菜单分组名：子项带该字段时下拉按分组多列展示，缺省为单列（后台栏目「菜单分组」配置） */
  group?: string
  /** 子项一句话说明，仅分组展示时显示（后台栏目「菜单说明」配置） */
  desc?: string
  /** 子项图标地址（预留，后端目前不下发，SRS 未要求前台菜单图标） */
  icon?: string
  /** 外部链接（http/https，后端已校验），有值时新窗口打开，path 为空串 */
  external?: string
  children?: MenuNode[]
}

/** 获取前台导航菜单树（对外栏目） */
export const getMenu = () => get<MenuNode[]>('/api/portal/menu')
