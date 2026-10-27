// 栏目页面级字段校验 —— 后台可自建页面后，路径与挂靠是导航与路由正确的前提
// 盯四件事：保留路径、路径唯一、首页固定、挂靠只有两层
import { BadRequestException } from '@nestjs/common'
import { applyPageFields } from '../src/modules/cms/channel-page-rules'
import { normalizePortalPath } from '../src/modules/cms/portal-cms.service'
import type { Channel } from '../src/modules/cms/channel.entity'

/** 造一个最小栏目实体 */
function ch(id: number, key: string, extra: Partial<Channel> = {}): Channel {
  return {
    id, key, name: key, parentId: null, portalPath: null, menuParent: null, externalUrl: null,
    heroBg: null, heroVideo: null, ...extra,
  } as Channel
}

const home = ch(1, 'home', { portalPath: '/' })
const es = ch(2, 'energy-solutions', { portalPath: '/energy-solutions' })
const overview = ch(3, 'es-overview', { portalPath: '/energy-solutions/overview', menuParent: 'energy-solutions' })
const all = [home, es, overview]

describe('applyPageFields', () => {
  it('接受合法的两段路径与挂靠', () => {
    const page = ch(9, 'es-new')
    applyPageFields(page, { portalPath: '/energy-solutions/new', menuParent: 'energy-solutions' }, all)
    expect(page.portalPath).toBe('/energy-solutions/new')
    expect(page.menuParent).toBe('energy-solutions')
  })

  it('拒绝系统保留路径与重复路径', () => {
    expect(() => applyPageFields(ch(9, 'x'), { portalPath: '/api/foo' }, all)).toThrow(BadRequestException)
    expect(() => applyPageFields(ch(9, 'x'), { portalPath: '/member' }, all)).toThrow(BadRequestException)
    expect(() => applyPageFields(ch(9, 'x'), { portalPath: '/energy-solutions' }, all)).toThrow(BadRequestException)
  })

  it('首页不能挂靠出去：否则挂靠目标的授权会并入首页', () => {
    expect(() => applyPageFields({ ...home }, { menuParent: 'energy-solutions' }, all)).toThrow(BadRequestException)
  })

  it('新闻页路径锁定、不能设外链；同值保存放行', () => {
    const news = ch(5, 'news', { portalPath: '/news' })
    const list = [...all, news]
    expect(() => applyPageFields({ ...news }, { portalPath: '/media' }, list)).toThrow(BadRequestException)
    expect(() => applyPageFields({ ...news }, { externalUrl: 'https://example.com' }, list)).toThrow(BadRequestException)
    expect(() => applyPageFields({ ...news }, { portalPath: '/news' }, list)).not.toThrow()
    // 旧值为空时也只能设成 /news，否则错误路径会被「锁定」
    expect(() => applyPageFields(ch(5, 'news'), { portalPath: '/media' }, all)).toThrow(BadRequestException)
    expect(() => applyPageFields(ch(5, 'news'), { portalPath: '/news' }, all)).not.toThrow()
  })

  it('首页路径不可改，别的栏目也不能占用根路径', () => {
    expect(() => applyPageFields({ ...home }, { portalPath: '/home' }, all)).toThrow(BadRequestException)
    expect(() => applyPageFields(ch(9, 'x'), { portalPath: '/' }, all)).toThrow(BadRequestException)
  })

  it('挂靠只有两层：不能挂到已挂靠的页面，也不能挂到首页或自身', () => {
    expect(() => applyPageFields(ch(9, 'x', { portalPath: '/x' }), { menuParent: 'es-overview' }, all)).toThrow(BadRequestException)
    expect(() => applyPageFields(ch(9, 'x', { portalPath: '/x' }), { menuParent: 'home' }, all)).toThrow(BadRequestException)
    expect(() => applyPageFields({ ...es }, { menuParent: 'energy-solutions' }, all)).toThrow(BadRequestException)
    // 已有页面挂在它下面的栏目，不能再挂出去
    const other = ch(4, 'other', { portalPath: '/other' })
    expect(() => applyPageFields({ ...es }, { menuParent: 'other' }, [...all, other])).toThrow(BadRequestException)
  })

  it('路径与外链二选一；子栏目不能设置页面级字段', () => {
    expect(() => applyPageFields(ch(9, 'x'), { portalPath: '/x', externalUrl: 'https://a.com' }, all)).toThrow(BadRequestException)
    expect(() => applyPageFields(ch(9, 'x', { parentId: 2 }), { heroBg: '/uploads/a.jpg' }, all)).toThrow(BadRequestException)
    // 子栏目表单把这些字段传成空串时视为未设置，不报错
    expect(() => applyPageFields(ch(9, 'x', { parentId: 2 }), { portalPath: '', externalUrl: '' }, all)).not.toThrow()
  })

  it('头图地址只认站内路径或 http(s)', () => {
    expect(() => applyPageFields(ch(9, 'x'), { heroBg: 'javascript:alert(1)' }, all)).toThrow(BadRequestException)
    expect(() => applyPageFields(ch(9, 'x'), { heroVideo: '//evil.com/a.mp4' }, all)).toThrow(BadRequestException)
    // 反斜杠会被浏览器规范成 /，同样是协议相对地址
    expect(() => applyPageFields(ch(9, 'x'), { heroBg: '/\\evil.com/a.jpg' }, all)).toThrow(BadRequestException)
    const ok = ch(9, 'x')
    applyPageFields(ok, { heroBg: '/uploads/a.jpg', heroVideo: 'https://cdn.example.com/a.mp4' }, all)
    expect(ok.heroBg).toBe('/uploads/a.jpg')
  })
})

describe('normalizePortalPath', () => {
  it('去尾斜杠、转小写，接受 1~2 段', () => {
    expect(normalizePortalPath('/Energy-Solutions/Overview/')).toBe('/energy-solutions/overview')
    expect(normalizePortalPath('/')).toBe('/')
  })

  it('拒绝三段及以上、非法字符与穿越', () => {
    expect(normalizePortalPath('/a/b/c')).toBeNull()
    expect(normalizePortalPath('/a/../b')).toBeNull()
    expect(normalizePortalPath('/a b')).toBeNull()
    expect(normalizePortalPath('')).toBeNull()
  })
})
