// 草稿预览令牌：绑定页面、过期失效、篡改无效
import { issuePreviewToken, PREVIEW_TTL_MS, verifyPreviewToken } from '../src/modules/cms/preview-token'

describe('preview token', () => {
  const now = 1_800_000_000_000

  it('本页面、有效期内校验通过', () => {
    const { token, expiresAt } = issuePreviewToken('es-overview', now)
    expect(expiresAt).toBe(now + PREVIEW_TTL_MS)
    expect(verifyPreviewToken(token, 'es-overview', now + 1000)).toBe(true)
  })

  it('换页面不通过：一个页面的预览链接看不到别的页面草稿', () => {
    const { token } = issuePreviewToken('es-overview', now)
    expect(verifyPreviewToken(token, 'bs-overview', now)).toBe(false)
  })

  it('过期不通过', () => {
    const { token } = issuePreviewToken('es-overview', now)
    expect(verifyPreviewToken(token, 'es-overview', now + PREVIEW_TTL_MS + 1)).toBe(false)
  })

  it('篡改过期时间或签名不通过', () => {
    const { token } = issuePreviewToken('es-overview', now)
    const [key, , sig] = token.split('.')
    const longer = (now + 10 * PREVIEW_TTL_MS).toString(36)
    expect(verifyPreviewToken(`${key}.${longer}.${sig}`, 'es-overview', now)).toBe(false)
    expect(verifyPreviewToken(`${token.slice(0, -2)}xx`, 'es-overview', now)).toBe(false)
  })

  it('格式异常一律不通过', () => {
    for (const bad of [undefined, null, 42, '', 'a.b', 'a.b.c.d', 'x'.repeat(400)]) {
      expect(verifyPreviewToken(bad, 'es-overview', now)).toBe(false)
    }
  })
})
