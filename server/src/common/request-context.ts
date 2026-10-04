// 请求上下文提取 —— 统一取真实 IP 与 User-Agent，供审计日志使用
import type { Request } from 'express'

/** 审计用请求上下文 */
export interface RequestContext {
  ip: string | null
  userAgent: string | null
}

/**
 * 提取客户端 IP 与 UA
 * IP 取 req.ip：由 main.ts 的 trust proxy 按受信网段解析 X-Forwarded-For，
 * 与限流用的是同一个地址。不直接取 XFF 首段——那一段由客户端随意填写，可伪造
 */
export function extractContext(req: Request): RequestContext {
  const ua = req.headers['user-agent']
  return {
    ip: req.ip || req.socket.remoteAddress || null,
    userAgent: typeof ua === 'string' ? ua : null,
  }
}
