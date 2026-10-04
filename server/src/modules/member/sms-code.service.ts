// 短信验证码服务 —— 开发期实现
// ⚠️ 当前无真实短信通道：验证码生成后写入存储并打印到服务端日志，供开发联调。
//    上线前必须替换 send() 为真实服务商调用。
//    对应设计方案 12.1 风险清单「短信验证码无真实通道」。
//
// 存储走 KvStore（配了 REDIS_URL 即用 Redis，否则进程内存）：
// 原先用进程内 Map，重启即丢、多实例下发码与校验落在不同进程必然失败。
import { Inject, Injectable, Logger } from '@nestjs/common'
import { KV_STORE, type KvStore } from '../kv/kv-store.interface'

/** 验证码用途 */
export type SmsPurpose = 'register' | 'login' | 'reset'

/** 验证码有效期（毫秒） */
const CODE_TTL_MS = 5 * 60 * 1000

/** 同一手机号最小发送间隔（毫秒） */
const SEND_INTERVAL_MS = 60 * 1000

/** 键名前缀，与图形验证码分开命名空间 */
const KEY_PREFIX = 'sms:'

/**
 * 构造存储键
 * 导出供冒烟脚本取码用——脚本要绕过真实短信通道拿到验证码，
 * 而码只存在于存储层。导出函数而非前缀常量，键的形状仍只在此处定义一次
 * @param phone 手机号
 * @param purpose 验证码用途
 */
export function smsCodeKey(phone: string, purpose: SmsPurpose): string {
  return `${KEY_PREFIX}${purpose}:${phone}`
}

/**
 * 存储中的验证码记录
 * sentAt 与 code 存在同一个键里：发送间隔（1 分钟）短于有效期（5 分钟），
 * 单键即可同时支撑「校验」与「频次限制」，不必多存一个计时键
 */
interface CodeRecord {
  code: string
  sentAt: number
}

@Injectable()
export class SmsCodeService {
  private readonly logger = new Logger(SmsCodeService.name)

  constructor(@Inject(KV_STORE) private readonly kv: KvStore) {}

  /**
   * 解析存储中的记录，脏数据按「无记录」处理
   * @param raw 存储里取出的原始字符串
   */
  private parse(raw: string | null): CodeRecord | null {
    if (!raw) return null
    try {
      const parsed = JSON.parse(raw) as Partial<CodeRecord>
      if (typeof parsed.code !== 'string' || typeof parsed.sentAt !== 'number') return null
      return { code: parsed.code, sentAt: parsed.sentAt }
    } catch {
      // 早期版本或人工写入的非 JSON 值：当作没有记录，让用户重新发码
      return null
    }
  }

  /**
   * 发送验证码
   * @param phone 手机号
   * @param purpose 验证码用途
   * @returns 发送失败时返回中文提示，成功返回 null
   */
  async send(phone: string, purpose: SmsPurpose): Promise<string | null> {
    const key = smsCodeKey(phone, purpose)
    const existing = this.parse(await this.kv.get(key))
    const now = Date.now()

    // 频次限制：同一手机号同一用途需间隔一分钟
    if (existing && now - existing.sentAt < SEND_INTERVAL_MS) {
      const wait = Math.ceil((SEND_INTERVAL_MS - (now - existing.sentAt)) / 1000)
      return `请求过于频繁，请 ${wait} 秒后再试`
    }

    const code = String(Math.floor(100000 + Math.random() * 900000))
    const record: CodeRecord = { code, sentAt: now }
    await this.kv.set(key, JSON.stringify(record), CODE_TTL_MS)

    // 开发期以日志替代真实短信下发
    this.logger.warn(`[开发期短信] ${phone} 用途=${purpose} 验证码=${code}（${CODE_TTL_MS / 60000} 分钟内有效）`)
    return null
  }

  /**
   * 校验验证码；校验通过后立即失效，防止重复使用
   * @param phone 手机号
   * @param purpose 验证码用途
   * @param code 用户填写的验证码
   * @returns 校验失败时返回中文提示，成功返回 null
   */
  async verify(phone: string, purpose: SmsPurpose, code: string | undefined): Promise<string | null> {
    if (!code) return '请输入验证码'
    const key = smsCodeKey(phone, purpose)
    const record = this.parse(await this.kv.get(key))
    if (!record) return '验证码不存在或已过期'

    // 错码不删记录：删了的话用户输错一位就得重新等一分钟才能再发，
    // 而记录本身有 5 分钟 TTL，不删也不会长期滞留
    if (record.code !== code) return '验证码错误'

    await this.kv.del(key)
    return null
  }
}
