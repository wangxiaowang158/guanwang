// 前台导航菜单接口层
import { get } from './request'
import type { MenuNode } from '@/mock/menu'

export type { MenuNode }

/** 获取前台导航菜单树（对外栏目） */
export const getMenu = () => get<MenuNode[]>('/api/web/menu')
