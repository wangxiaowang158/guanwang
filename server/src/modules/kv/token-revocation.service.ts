// 令牌吊销 —— 退出登录后让该令牌立即失效
//
// JWT 无状态，服务端不记会话，原先「退出」只是前端丢掉令牌：令牌若已被截获，
// 在有效期内（管理端 8 小时）照样能用。这里把退出的令牌记进黑名单，守卫每次核对。
// 只记令牌的哈希不记原文：存储即便泄露也拿不到可用令牌；存活到令牌自然过期为止，
// 过期后令牌本就验签不过，黑名单项随之自动清理，不会无限增长。
import { Inject, Injectable } from '@nestjs/common'
import { createHash } from 'node:crypto'
import { KV_STORE, type KvStore } from './kv-store.interface'

/** 黑名单键前缀 */
const REVOKED_PREFIX = 'revoked-token:'

@Injectable()
export class TokenRevocationService {
  constructor(@Inject(KV_STORE) private readonly kv: KvStore) {}

  /**
   * 吊销令牌
   * @param token 令牌原文
   * @param expSeconds 令牌载荷中的 exp（Unix 秒）；已过期或缺失时无需记录
   */
  async revoke(token: string, expSeconds: number | undefined): Promise<void> {
    if (!expSeconds) return
    const ttlMs = expSeconds * 1000 - Date.now()
    if (ttlMs <= 0) return
    await this.kv.set(this.keyOf(token), '1', ttlMs)
  }

  /**
   * 令牌是否已吊销
   * @param token 令牌原文
   */
  async isRevoked(token: string): Promise<boolean> {
    return (await this.kv.get(this.keyOf(token))) !== null
  }

  /** 令牌 → 黑名单键：SHA-256 摘要，定长且不可逆 */
  private keyOf(token: string): string {
    return `${REVOKED_PREFIX}${createHash('sha256').update(token).digest('hex')}`
  }
}
