// 栏目「页面级」字段的业务校验 —— 页面路径、菜单挂靠、导航外链、头图素材
// DTO 只挡形态，这里挡语义：保留路径、路径唯一、挂靠层级、字段只对顶级栏目生效
import { BadRequestException } from '@nestjs/common'
import type { Channel } from './channel.entity'

/**
 * 前台固定路由与网关专用前缀占用的首段，页面路径不得以它们开头
 * 须与 web/src/router/index.ts 的固定路由、docker/nginx/gateway.conf 的专用 location 保持一致
 */
export const RESERVED_PATH_SEGMENTS = new Set([
  'api', 'uploads', 'assets', 'article', 'member', 'privacy', 'search', 'index.html',
  'sitemap.xml', 'robots.txt', '__prerender', '__prerender_head',
])

/** 首页路径，固定为根路径，不允许改动或被别的栏目占用 */
export const HOME_PATH = '/'

/** 新闻资讯栏目 key：与 channel.service 的 PINNED_PAGE_KEYS 同口径，页面路径锁定 */
const NEWS_KEY = 'news'
/** 新闻页路径：前台固定路由 web/src/router 的 'news' */
const NEWS_PATH = '/news'

/** 页面级字段补丁：两个 DTO 都在结构上满足 */
export interface PagePatch {
  portalPath?: string
  menuParent?: string
  externalUrl?: string
  heroBg?: string
  heroVideo?: string
}

/**
 * 头图素材地址：站内路径或 http(s) 绝对地址
 * 站内路径第二个字符不能是 / 或 \，且全串不含 \ 与空白：浏览器会把 \ 规范成 /，
 * 「/\evil.com/a.jpg」就成了协议相对地址 //evil.com/a.jpg
 */
function isSafeAsset(v: string): boolean {
  if (/^\/(?![/\\])[^\\\s]*$/.test(v)) return true
  return /^https?:\/\/[^\\\s]+$/.test(v)
}

/** 空串即清空 */
const norm = (v: string | undefined): string | null | undefined =>
  v === undefined ? undefined : v.trim() || null

/**
 * 校验并应用页面级字段到实体
 * @param entity 待保存的栏目（新建时 parentId 已赋值）
 * @param dto 入参补丁
 * @param all 库中全部栏目，用于判重与挂靠校验
 */
export function applyPageFields(entity: Channel, dto: PagePatch, all: Channel[]): void {
  const portalPath = norm(dto.portalPath)
  const menuParent = norm(dto.menuParent)
  const externalUrl = norm(dto.externalUrl)
  const heroBg = norm(dto.heroBg)
  const heroVideo = norm(dto.heroVideo)
  const touched = [portalPath, menuParent, externalUrl, heroBg, heroVideo].some(v => v !== undefined && v !== null)

  // 页面级字段只对顶级栏目有意义：子栏目是页面里的区块，没有自己的地址
  if (entity.parentId !== null && touched) {
    throw new BadRequestException('页面路径、菜单挂靠、外链与头图只能设置在一级栏目上')
  }

  if (portalPath !== undefined) assignPortalPath(entity, portalPath, all)
  if (externalUrl !== undefined) {
    if (externalUrl !== null && entity.key === NEWS_KEY) throw new BadRequestException('新闻资讯页不能设为外链')
    entity.externalUrl = externalUrl
  }
  if (menuParent !== undefined) assignMenuParent(entity, menuParent, all)
  for (const [field, v] of [['heroBg', heroBg], ['heroVideo', heroVideo]] as const) {
    if (v === undefined) continue
    if (v !== null && !isSafeAsset(v)) throw new BadRequestException('头图地址须为上传后的站内路径或 http(s) 地址')
    entity[field] = v
  }

  if (entity.portalPath && entity.externalUrl) {
    throw new BadRequestException('页面路径与外链只能二选一：外链栏目不对应站内页面')
  }
}

/** 页面路径：保留段、首页固定、全局唯一 */
function assignPortalPath(entity: Channel, path: string | null, all: Channel[]): void {
  // 首页的根路径是前台入口，改掉或清空都会让站点没有首页
  if (entity.portalPath === HOME_PATH && path !== HOME_PATH) {
    throw new BadRequestException('首页路径固定为 /，不可修改')
  }
  // 新闻页由前台固定路由 /news 承载（文章详情、列表都依赖它），改了或清空导航就会指向空页
  if (entity.key === NEWS_KEY && path !== NEWS_PATH) {
    throw new BadRequestException(`新闻资讯页面路径固定为 ${NEWS_PATH}，不可修改`)
  }
  if (path === null) {
    // 有别的页面挂靠在它下面时，清空路径会让那些页面在导航里失去归属
    if (all.some(c => c.menuParent === entity.key && c.id !== entity.id)) {
      throw new BadRequestException('有页面挂靠在该栏目下，请先调整这些页面的菜单挂靠')
    }
    entity.portalPath = null
    return
  }
  if (path === HOME_PATH && entity.portalPath !== HOME_PATH) {
    throw new BadRequestException('根路径 / 已被首页占用')
  }
  const first = path.split('/')[1] ?? ''
  if (RESERVED_PATH_SEGMENTS.has(first)) {
    throw new BadRequestException(`路径不能以 /${first} 开头，该地址已被系统占用`)
  }
  if (all.some(c => c.portalPath === path && c.id !== entity.id)) {
    throw new BadRequestException('该页面路径已被其他栏目使用')
  }
  entity.portalPath = path
}

/** 菜单挂靠：目标须是未挂靠的顶级页面，且不能挂到自己；被别人挂靠的页面不能再挂出去 */
function assignMenuParent(entity: Channel, key: string | null, all: Channel[]): void {
  if (key === null) {
    entity.menuParent = null
    return
  }
  // 首页挂出去后，挂靠目标的授权名会并入首页的授权项（resolvePermNames），只管某个页面的编辑就能改首页
  if (entity.portalPath === HOME_PATH) throw new BadRequestException('首页不能挂靠到其他栏目')
  if (key === entity.key) throw new BadRequestException('不能挂靠到自身')
  const target = all.find(c => c.key === key)
  if (!target || target.parentId !== null || !target.portalPath || target.portalPath === HOME_PATH) {
    throw new BadRequestException('挂靠目标须为首页以外、配了页面路径的一级栏目')
  }
  // 导航只有两层：目标自己挂在别处，或本栏目下已有挂靠页，再挂就成了三层
  if (target.menuParent) throw new BadRequestException('挂靠目标本身已挂靠在其他栏目下，导航只支持两层')
  if (all.some(c => c.menuParent === entity.key && c.id !== entity.id)) {
    throw new BadRequestException('已有页面挂靠在该栏目下，它不能再挂靠到别处')
  }
  entity.menuParent = key
}
