// 栏目可删 / 可禁用的判定规则 —— 栏目树与编辑面板共用，与后端 channel.service.ts 同一口径
import type { Channel } from '@/api/cms'

/** 后端拒删的系统功能栏目类型，须与 server channel.service.ts remove() 的清单一致 */
export const UNDELETABLE_TYPES = [
  'siteconfig', 'admins', 'members', 'feedback', 'authconfig', 'loginlog', 'oplog',
]

/** 被官网代码按 key 直接引用、后端拒删的页面，须与 server channel.service.ts 的 PINNED_PAGE_KEYS 一致 */
const PINNED_PAGE_KEYS = ['home', 'news']

/**
 * 是否显示删除入口：首页、新闻与系统栏目后端必拒，不给入口免得点了才被告知不行。
 * 「有页面挂靠在它下面」「后代含系统栏目」这类需要查整棵树的情况仍交给后端判断并提示
 */
export const canDelete = (node: Channel) =>
  !PINNED_PAGE_KEYS.includes(node.key) && node.portalPath !== '/' && !UNDELETABLE_TYPES.includes(node.type)

/**
 * 是否可启用/禁用：对一级与二级栏目都开放，与后端 assertHideable 口径一致——
 * 系统功能栏目禁用后会失去入口，首页是前台根路径
 */
export const hideable = (node: { type: string; portalPath?: string | null }) =>
  !UNDELETABLE_TYPES.includes(node.type) && node.portalPath !== '/'
