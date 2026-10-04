// Redis 实现 —— 配置了 REDIS_URL 时启用
//
// 失败取向：验证码相关操作一律「失败即拒绝」，不静默放行。
// 理由：Redis 不可用时若把 get 当成「没有这个键」，图形验证码会变成
// 「随便填都算过」——风控在最需要它的时候恰好失效。宁可让用户看到
// 「服务暂时不可用」，也不能把校验悄悄跳过。
import {
  Injectable,
  Logger,
  ServiceUnavailableException,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common'
import { Redis } from 'ioredis'
import { REDIS } from '../../config/app.config'
import type { KvStore } from './kv-store.interface'

@Injectable()
export class RedisKvStore implements KvStore, OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisKvStore.name)
  private readonly client: Redis

  constructor() {
    this.client = new Redis(REDIS.url, {
      keyPrefix: REDIS.keyPrefix,
      // 命令超时：Redis 假死时快速失败，而非把请求挂到网关超时
      commandTimeout: REDIS.commandTimeoutMs,
      // 单条命令最多重试 1 次即报错。默认值 20 会让一条命令在网络抖动时
      // 反复重试几十秒，请求早已超时，重试只是白占连接
      maxRetriesPerRequest: 1,
      // 手动连接：构造即连会让连不上时在模块实例化阶段抛错，
      // 整个应用起不来——而 Redis 只服务验证码，不该拖垮全站
      lazyConnect: true,
    })

    // 连接层错误必须挂监听：ioredis 的 error 事件无监听者时会以
    // unhandled error 形式冒到进程顶层，直接把服务打挂
    this.client.on('error', err => {
      this.logger.error(`Redis 连接异常：${err.message}`)
    })
  }

  /** 启动时连一次，连不上只告警不阻断启动 */
  async onModuleInit(): Promise<void> {
    try {
      await this.client.connect()
      this.logger.log(`验证码存储已接入 Redis，键前缀 ${REDIS.keyPrefix}`)
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err)
      // 不抛：ioredis 会持续重连，Redis 起来后自动恢复。
      // 这期间验证码相关接口会报错，但站点其余功能照常
      this.logger.error(`Redis 首次连接失败（将持续重试）：${reason}`)
    }
  }

  /** 进程退出前主动断开，避免容器停止时留下半开连接 */
  async onModuleDestroy(): Promise<void> {
    // quit 比 disconnect 温和：等待在途命令回完再关
    await this.client.quit().catch(() => this.client.disconnect())
  }

  /**
   * 统一包装命令执行：把 ioredis 的连接/超时错误转成 503
   *
   * 不吞掉错误——吞掉就等于放行验证码。转换只为让调用方拿到明确的
   * 「服务暂时不可用」而非裸露的 Internal server error 与 ioredis 栈信息
   */
  private async exec<T>(action: string, run: () => Promise<T>): Promise<T> {
    try {
      return await run()
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err)
      this.logger.error(`Redis ${action} 失败：${reason}`)
      // 文案不能只说验证码：登录锁定计数、退出吊销核对也走这里，失败时看到的都是这句
      throw new ServiceUnavailableException('服务暂时不可用，请稍后重试')
    }
  }

  async get(key: string): Promise<string | null> {
    return this.exec('读取', () => this.client.get(key))
  }

  async set(key: string, value: string, ttlMs: number): Promise<void> {
    // PX 单位为毫秒，与接口约定一致；TTL 到期由 Redis 自行清理
    await this.exec('写入', () => this.client.set(key, value, 'PX', ttlMs))
  }

  async del(key: string): Promise<void> {
    await this.exec('删除', () => this.client.del(key))
  }

  async getAndDel(key: string): Promise<string | null> {
    return this.exec('取用', () => this.getAndDelRaw(key))
  }

  async incr(key: string, ttlMs: number): Promise<number> {
    return this.exec('计数', async () => {
      // INCR 与 PEXPIRE NX 放进同一个事务：分两条发，中间进程崩溃会留下永不过期的计数键，
      // 账号就被永久锁住。NX 只在键尚无过期时间时设定，窗口从第一次失败起算、不随试错续期
      const res = await this.client.multi().incr(key).pexpire(key, ttlMs, 'NX').exec()
      const [err, value] = res?.[0] ?? [new Error('事务未执行'), null]
      if (err) throw err
      return Number(value)
    })
  }

  /** getAndDel 的实际执行体，错误由 exec 统一转换 */
  private async getAndDelRaw(key: string): Promise<string | null> {
    // GETDEL 是 Redis 6.2+ 的原子命令。低版本会报 unknown command，
    // 此时回落到 multi 事务——同样原子，只是多一次往返
    try {
      return await this.client.getdel(key)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      if (!message.includes('unknown command')) throw err
      const results = await this.client.multi().get(key).del(key).exec()
      // exec 返回 [[err, value], [err, count]]，取第一条命令的返回值
      const first = results?.[0]
      if (!first) return null
      const [execErr, value] = first
      if (execErr) throw execErr
      return typeof value === 'string' ? value : null
    }
  }
}
