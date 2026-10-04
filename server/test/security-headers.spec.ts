// 安全响应头中间件 —— 后端直连场景的那一层防护
// 网关会剥掉同名头再补自己的，但本层必须独立成立：
// 本地开发、内网排障、3000 端口被直接暴露时它是唯一一道
import type { NextFunction, Request, Response } from 'express'
import {
  securityHeadersMiddleware,
  uploadSecurityHeadersMiddleware,
} from '../src/common/middleware/security-headers.middleware'

/** 收集 setHeader 调用的假 Response */
function fakeRes(): { res: Response; headers: Record<string, string> } {
  const headers: Record<string, string> = {}
  const res = {
    setHeader(name: string, value: string) {
      headers[name] = value
    },
  } as unknown as Response
  return { res, headers }
}

describe('securityHeadersMiddleware', () => {
  it('写入四个基础头与严格 CSP', () => {
    const { res, headers } = fakeRes()
    const next = jest.fn<void, []>() as unknown as NextFunction

    securityHeadersMiddleware({} as Request, res, next)

    expect(headers['X-Content-Type-Options']).toBe('nosniff')
    expect(headers['X-Frame-Options']).toBe('DENY')
    expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin')
    expect(headers['Permissions-Policy']).toBe('camera=(), microphone=(), geolocation=()')
    expect(headers['Content-Security-Policy']).toBe(
      "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
    )
    expect(next).toHaveBeenCalledTimes(1)
  })

  it('CSP 默认全禁，不留 script-src 口子', () => {
    const { res, headers } = fakeRes()
    securityHeadersMiddleware({} as Request, res, (() => {}) as NextFunction)

    const csp = headers['Content-Security-Policy']
    expect(csp).toContain("default-src 'none'")
    expect(csp).not.toContain('unsafe-inline')
    expect(csp).not.toContain('unsafe-eval')
  })

  it('必须调用 next，否则所有请求会挂住', () => {
    const { res } = fakeRes()
    const next = jest.fn<void, []>() as unknown as NextFunction
    securityHeadersMiddleware({} as Request, res, next)
    expect(next).toHaveBeenCalled()
  })
})

describe('uploadSecurityHeadersMiddleware', () => {
  it('在严格 CSP 之上追加 sandbox', () => {
    const { res, headers } = fakeRes()
    const next = jest.fn<void, []>() as unknown as NextFunction

    uploadSecurityHeadersMiddleware({} as Request, res, next)

    expect(headers['Content-Security-Policy']).toBe(
      "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'; sandbox",
    )
    expect(next).toHaveBeenCalledTimes(1)
  })

  it('sandbox 不带任何 allow-*，即最严格沙箱', () => {
    const { res, headers } = fakeRes()
    uploadSecurityHeadersMiddleware({} as Request, res, (() => {}) as NextFunction)

    const csp = headers['Content-Security-Policy']
    expect(csp).toMatch(/sandbox$/)
    expect(csp).not.toContain('allow-scripts')
    expect(csp).not.toContain('allow-same-origin')
  })
})
