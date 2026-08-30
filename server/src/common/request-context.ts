// 请求上下文提取 —— 统一取真实 IP 与 User-Agent，供审计日志使用
import type { Request } from 'express'

/** 审计用请求上下文 */
export interface RequestContext {
  ip: string | null
  userAgent: string | null
}

/**
 * 提取客户端 IP 与 UA
 * 注意：X-Forwarded-For 可被伪造，仅在受信任反向代理后方可采信；
 * 此处取首个地址用于审计留痕，不作为安全决策依据。
 */
export function extractContext(req: Request): RequestContext {
  const forwarded = req.headers['x-forwarded-for']
  const forwardedIp =
    typeof forwarded === 'string' ? forwarded.split(',')[0]?.trim() : Array.isArray(forwarded) ? forwarded[0] : undefined

  const ua = req.headers['user-agent']
  return {
    ip: forwardedIp || req.ip || req.socket.remoteAddress || null,
    userAgent: typeof ua === 'string' ? ua : null,
  }
}
