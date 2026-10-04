// 富文本转纯文本 —— 首页板块用它把后台富文本转成前台可直接插值的文本
// 盯两件事：块级边界要变成换行（产品特性按行拆分依赖它），标签不能残留
import { htmlToText } from '../src/common/utils/html-to-text'

describe('htmlToText', () => {
  it('空值返回空串', () => {
    expect(htmlToText(null)).toBe('')
    expect(htmlToText(undefined)).toBe('')
    expect(htmlToText('')).toBe('')
  })

  it('纯文本按原样保留换行', () => {
    expect(htmlToText('高效节能\n智能控制')).toBe('高效节能\n智能控制')
  })

  it('段落转为换行且不残留标签', () => {
    expect(htmlToText('<p>高效节能</p><p>智能<strong>控制</strong></p>')).toBe('高效节能\n智能控制')
  })

  it('列表项与 br 都作为分隔', () => {
    expect(htmlToText('<ul><li>一</li><li>二</li></ul>')).toBe('一\n二')
    expect(htmlToText('甲<br>乙<br/>丙')).toBe('甲\n乙\n丙')
  })

  it('空段落不产生空行', () => {
    expect(htmlToText('<p>一</p><p></p><p>  </p><p>二</p>')).toBe('一\n二')
  })

  it('实体解码且 &amp; 不被二次解码', () => {
    expect(htmlToText('<p>A&nbsp;&amp;&nbsp;B</p>')).toBe('A & B')
    expect(htmlToText('<p>&amp;lt;</p>')).toBe('&lt;')
  })
})
