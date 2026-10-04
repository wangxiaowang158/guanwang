// 进程内存实现 —— 未配置 REDIS_URL 时的回落方案
//
// 适用范围仅限本地开发与确定单实例的部署。两处硬伤写在这里而非藏在文档里：
// 1. 重启即丢：用户刚收到的验证码会突然失效
// 2. 多实例不共享：发码落在 A 实例、校验打到 B 实例必然失败
// 生产多实例务必配 REDIS_URL。
import { Injectable, Logger, type OnModuleDestroy } from '@nestjs/common'
import type { KvStore } from './kv-store.interface'

/** 内存记录 */
interface Entry {
  value: string
  expiresAt: number
}

/**
 * 清扫间隔（毫秒）
 * 过期键不会被主动读到（get 时判时间戳），清扫只为回收内存，
 * 故不必频繁；取 5 分钟与验证码最长有效期同量级
 */
const SWEEP_INTERVAL_MS = 5 * 60 * 1000

@Injectable()
export class MemoryKvStore implements KvStore, OnModuleDestroy {
  private readonly logger = new Logger(MemoryKvStore.name)
  private readonly store = new Map<string, Entry>()
  private timer: NodeJS.Timeout | null = null

  constructor() {
    this.logger.warn(
      '验证码存储使用进程内存：重启即失效，且多实例部署下校验会随机失败。生产环境请配置 REDIS_URL',
    )
    // unref 让定时器不阻止进程退出，否则单元测试与 CLI 脚本会挂住不结束
    this.timer = setInterval(() => this.sweep(), SWEEP_INTERVAL_MS)
    this.timer.unref()
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
    this.store.clear()
  }

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key)
    if (!entry) return null
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key)
      return null
    }
    return entry.value
  }

  async set(key: string, value: string, ttlMs: number): Promise<void> {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs })
  }

  async del(key: string): Promise<void> {
    this.store.delete(key)
  }

  async getAndDel(key: string): Promise<string | null> {
    const value = await this.get(key)
    // 单线程的 Node 里 get 与 delete 之间不会被打断，故此处天然原子
    this.store.delete(key)
    return value
  }

  async incr(key: string, ttlMs: number): Promise<number> {
    // 同步完成读改写，单线程下不会被其他请求插入，天然原子
    const entry = this.store.get(key)
    if (!entry || Date.now() > entry.expiresAt) {
      this.store.set(key, { value: '1', expiresAt: Date.now() + ttlMs })
      return 1
    }
    const next = (Number(entry.value) || 0) + 1
    entry.value = String(next)
    return next
  }

  /** 清理过期记录，避免内存无界增长 */
  private sweep(): void {
    const now = Date.now()
    for (const [key, entry] of this.store) {
      if (now > entry.expiresAt) this.store.delete(key)
    }
  }
}
