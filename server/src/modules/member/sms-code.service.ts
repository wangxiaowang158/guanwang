// 短信验证码服务 —— 开发期实现
// ⚠️ 当前无真实短信通道：验证码生成后写入内存并打印到服务端日志，供开发联调。
//    上线前必须替换 send() 为真实服务商调用，并改用 Redis 等共享存储（内存方案不支持多实例）。
//    对应设计方案 12.1 风险清单「短信验证码无真实通道」。
import { Injectable, Logger } from '@nestjs/common'

/** 验证码用途 */
export type SmsPurpose = 'register' | 'login' | 'reset'

/** 验证码有效期（毫秒） */
const CODE_TTL_MS = 5 * 60 * 1000

/** 同一手机号最小发送间隔（毫秒） */
const SEND_INTERVAL_MS = 60 * 1000

/** 内存中保存的验证码记录 */
interface CodeRecord {
  code: string
  expiresAt: number
  sentAt: number
}

@Injectable()
export class SmsCodeService {
  private readonly logger = new Logger(SmsCodeService.name)
  private readonly store = new Map<string, CodeRecord>()

  /** 组合存储键，不同用途互不干扰 */
  private key(phone: string, purpose: SmsPurpose): string {
    return `${purpose}:${phone}`
  }

  /**
   * 发送验证码
   * @returns 发送失败时返回中文提示，成功返回 null
   */
  send(phone: string, purpose: SmsPurpose): string | null {
    this.sweep()
    const key = this.key(phone, purpose)
    const existing = this.store.get(key)
    const now = Date.now()

    // 频次限制：同一手机号同一用途需间隔一分钟
    if (existing && now - existing.sentAt < SEND_INTERVAL_MS) {
      const wait = Math.ceil((SEND_INTERVAL_MS - (now - existing.sentAt)) / 1000)
      return `请求过于频繁，请 ${wait} 秒后再试`
    }

    const code = String(Math.floor(100000 + Math.random() * 900000))
    this.store.set(key, { code, expiresAt: now + CODE_TTL_MS, sentAt: now })

    // 开发期以日志替代真实短信下发
    this.logger.warn(`[开发期短信] ${phone} 用途=${purpose} 验证码=${code}（${CODE_TTL_MS / 60000} 分钟内有效）`)
    return null
  }

  /**
   * 校验验证码；校验通过后立即失效，防止重复使用
   * @returns 校验失败时返回中文提示，成功返回 null
   */
  verify(phone: string, purpose: SmsPurpose, code: string | undefined): string | null {
    if (!code) return '请输入验证码'
    const key = this.key(phone, purpose)
    const record = this.store.get(key)
    if (!record) return '验证码不存在或已过期'
    if (Date.now() > record.expiresAt) {
      this.store.delete(key)
      return '验证码不存在或已过期'
    }
    if (record.code !== code) return '验证码错误'

    this.store.delete(key)
    return null
  }

  /** 清理过期记录，避免内存无界增长 */
  private sweep(): void {
    const now = Date.now()
    for (const [key, record] of this.store) {
      if (now > record.expiresAt) this.store.delete(key)
    }
  }
}
