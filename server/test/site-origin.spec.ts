// 站点 origin 规整 —— sitemap / robots / 预渲染共用，口径须稳定
// 盯三件事：剔除控制字符、补协议头、去尾斜杠
import { normalizeOrigin } from '../src/modules/cms/site-origin'

describe('normalizeOrigin', () => {
  it('剔除换行、制表符、NUL 与 DEL 等控制字符', () => {
    expect(normalizeOrigin('www.exa\nmple.com\t')).toBe('https://www.example.com')
    expect(normalizeOrigin('\u0000www.example.com\u007F')).toBe('https://www.example.com')
  })

  it('保留中文等非控制字符', () => {
    expect(normalizeOrigin('中瑞恒.cn')).toBe('https://中瑞恒.cn')
  })

  it('缺协议头补 https，已有协议原样保留', () => {
    expect(normalizeOrigin('www.example.com')).toBe('https://www.example.com')
    expect(normalizeOrigin('http://www.example.com')).toBe('http://www.example.com')
  })

  it('去掉尾部斜杠，空值返回空串', () => {
    expect(normalizeOrigin('https://www.example.com///')).toBe('https://www.example.com')
    expect(normalizeOrigin('  ')).toBe('')
  })
})
