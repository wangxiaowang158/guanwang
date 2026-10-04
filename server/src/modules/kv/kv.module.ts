// 键值存储模块 —— 按 REDIS_URL 是否配置决定用哪个实现
//
// 全局模块：验证码之外，后续的风控计数、一次性令牌都可能用到，
// 逐个业务模块 import 一遍没有意义。
import { Global, Module } from '@nestjs/common'
import { REDIS } from '../../config/app.config'
import { KV_STORE, type KvStore } from './kv-store.interface'
import { MemoryKvStore } from './memory-kv.store'
import { RedisKvStore } from './redis-kv.store'
import { TokenRevocationService } from './token-revocation.service'

/**
 * 选型在工厂里完成而非两个模块二选一：
 * 让「配了就用 Redis，没配就用内存」这一条规则只存在于一处
 */
function createKvStore(): KvStore {
  if (REDIS.url) return new RedisKvStore()
  return new MemoryKvStore()
}

@Global()
@Module({
  providers: [
    {
      provide: KV_STORE,
      useFactory: createKvStore,
    },
    // 令牌吊销依赖 KV 且管理端、会员端守卫都要用，随全局模块一起导出
    TokenRevocationService,
  ],
  exports: [KV_STORE, TokenRevocationService],
})
export class KvModule {}
