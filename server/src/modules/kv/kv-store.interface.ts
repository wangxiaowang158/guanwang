// 带过期时间的键值存储抽象 —— 验证码类短时效数据的唯一落点
//
// 抽出接口而非直接用 ioredis：本地开发与单实例部署不该被迫多起一个 Redis，
// 而业务代码也不该为「有没有 Redis」写两套分支。
//
// 只定义验证码、登录计数、编辑锁真正用到的操作，不做通用缓存层：
// 接口越小，内存实现与 Redis 实现的语义差异就越少，越不容易出现
// 「本地能过、线上不行」这类只在某一实现下暴露的问题。

/** 注入令牌；接口在 TS 里无运行时实体，须用字符串令牌 */
export const KV_STORE = 'KV_STORE'

export interface KvStore {
  /**
   * 取值
   * @param key 键名（调用方不必自带前缀，实现负责加）
   * @returns 不存在或已过期时返回 null
   */
  get(key: string): Promise<string | null>

  /**
   * 写值并设定过期时间
   * @param key 键名
   * @param value 值
   * @param ttlMs 存活毫秒数，到期自动消失
   */
  set(key: string, value: string, ttlMs: number): Promise<void>

  /**
   * 键不存在时才写入（原子），并设定过期时间
   *
   * 编辑锁抢锁必须用它而非 get + set：两人同时进入时都读到「无锁」，
   * 各自写入后两边都以为拿到了锁
   * @param key 键名
   * @param value 值
   * @param ttlMs 存活毫秒数
   * @returns 是否写入成功；键已存在（且未过期）时返回 false
   */
  setIfAbsent(key: string, value: string, ttlMs: number): Promise<boolean>

  /**
   * 当前值等于 expected 时才写入（原子），并重设过期时间
   *
   * 编辑锁续约必须用它而非 get + set：读到本人锁之后它恰好到期、被别人抢到，
   * 无条件 set 会把对方的锁覆盖掉
   * @returns 是否写入；值已变（或键已不存在）时返回 false，调用方重读再试
   */
  compareAndSet(key: string, expected: string, value: string, ttlMs: number): Promise<boolean>

  /**
   * 当前值等于 expected 时才删除（原子）
   * @returns 是否删除；值已变时返回 false
   */
  compareAndDel(key: string, expected: string): Promise<boolean>

  /**
   * 删除
   * 验证码「校验一次即失效」依赖它，故不存在的键也须静默成功
   * @param key 键名
   */
  del(key: string): Promise<void>

  /**
   * 取值并立即删除（原子）
   *
   * 验证码校验必须用它而非 get + del：两步之间存在时间窗，
   * 并发提交同一个验证码时两个请求都能读到值，等于验证码可复用一次以上。
   * @param key 键名
   * @returns 删除前的值；键不存在时返回 null
   */
  getAndDel(key: string): Promise<string | null>

  /**
   * 计数加一（原子），键不存在时从 0 起算并设定过期时间
   *
   * 失败计数必须用它而非 get + set：并发的 N 个错误请求读到同一个旧值，
   * 写回去只记成 1 次，锁定阈值形同虚设。过期时间只在首次创建时设定，
   * 即「窗口从第一次失败起算」，持续试错不会无限续期
   * @param key 键名
   * @param ttlMs 首次创建时的存活毫秒数
   * @returns 加一后的值
   */
  incr(key: string, ttlMs: number): Promise<number>
}
