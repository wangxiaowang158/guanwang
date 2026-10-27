// 首页布局与页脚配置净化：白名单、去重、补齐默认板块、地址协议过滤
import { assetUrl, HOME_SECTIONS, normalizeFooterConfig, normalizeHomeLayout } from '../src/common/site-layout'

describe('normalizeHomeLayout', () => {
  it('空值返回默认顺序、全部显示', () => {
    for (const input of [null, undefined, '', 'not json', {}, 42]) {
      const out = normalizeHomeLayout(input)
      expect(out.map(s => s.key)).toEqual([...HOME_SECTIONS])
      expect(out.every(s => s.visible && s.tone === 'auto')).toBe(true)
    }
  })

  it('保留顺序与显隐，剔除未知与重复板块，缺的按默认顺序补在末尾且显示', () => {
    const out = normalizeHomeLayout([
      { key: 'news', visible: false, title: '  最新动态  ' },
      { key: 'evil' },
      { key: 'news', visible: true },
      { key: 'contact', tone: 'surface' },
      { key: 'view', tone: 'dark' },
    ])
    expect(out.map(s => s.key)).toEqual(['news', 'contact', 'view', 'business-trio', 'advantage', 'case', 'partner'])
    expect(out[0]).toEqual({ key: 'news', visible: false, tone: 'auto', title: '最新动态' })
    expect(out[1].tone).toBe('surface')
    expect(out[2].tone).toBe('dark')
    expect(out.slice(2).every(s => s.visible)).toBe(true)
  })

  it('已保存布局以联系收尾时，新增板块补在联系之前', () => {
    const saved = ['business-trio', 'advantage', 'news', 'partner', 'view', 'contact'].map(key => ({ key }))
    const out = normalizeHomeLayout(saved)
    expect(out.map(s => s.key)).toEqual(['business-trio', 'advantage', 'news', 'partner', 'view', 'case', 'contact'])
    expect(out[5]).toEqual({ key: 'case', visible: true, tone: 'auto' })
  })

  it('深色底只给卡片型板块，其余回落 auto', () => {
    const out = normalizeHomeLayout([{ key: 'contact', tone: 'dark' }, { key: 'partner', tone: 'dark' }])
    expect(out[0].tone).toBe('auto')
    expect(out[1].tone).toBe('auto')
  })

  it('接受库里的 JSON 文本；非法底色回落 auto，标题限长 100', () => {
    const out = normalizeHomeLayout(JSON.stringify([{ key: 'view', tone: 'neon', eyebrow: 'x'.repeat(300) }]))
    expect(out[0].tone).toBe('auto')
    expect(out[0].eyebrow).toHaveLength(100)
  })
})

describe('normalizeFooterConfig', () => {
  it('空值返回空配置', () => {
    expect(normalizeFooterConfig(null)).toEqual({ columns: [], friendLinks: [], socials: [] })
  })

  it('友情链接只放行 http(s)，社交账号至少有链接或二维码', () => {
    const out = normalizeFooterConfig({
      columns: ['business', 'BAD KEY', 'business', 'about'],
      friendLinks: [
        { name: '百度', url: 'https://www.baidu.com' },
        { name: '坏链', url: 'javascript:alert(1)' },
        { name: '', url: 'https://a.com' },
      ],
      socials: [
        { type: 'wechat', qr: '/uploads/qr.png' },
        { type: 'weibo', url: 'https://weibo.com/x', qr: '//evil.com/a.png' },
        { type: 'douyin' },
        { type: 'myspace', url: 'https://myspace.com' },
      ],
    })
    expect(out.columns).toEqual(['business', 'about'])
    expect(out.friendLinks).toEqual([{ name: '百度', url: 'https://www.baidu.com' }])
    expect(out.socials).toEqual([
      { type: 'wechat', qr: '/uploads/qr.png' },
      { type: 'weibo', url: 'https://weibo.com/x' },
    ])
  })
})

describe('assetUrl', () => {
  it('站内路径与 http(s) 通过，协议相对、反斜杠、伪协议拦下', () => {
    expect(assetUrl('/uploads/a.jpg')).toBe('/uploads/a.jpg')
    expect(assetUrl('https://cdn.example.com/a.jpg')).toBe('https://cdn.example.com/a.jpg')
    expect(assetUrl('//evil.com/a.jpg')).toBeUndefined()
    expect(assetUrl('/\\evil.com/a.jpg')).toBeUndefined()
    expect(assetUrl('javascript:alert(1)')).toBeUndefined()
    expect(assetUrl("/a.jpg') ; background:url(x")).toBeUndefined()
    expect(assetUrl("/a.jpg');color:red;x:url('")).toBeUndefined()
  })
})
