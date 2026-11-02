// Redis 条件写入 —— 盯参数顺序与返回值换算（Lua 本身需真实 Redis，见部署前验证）
// 1) setIfAbsent 发 SET key val PX ttl NX，'OK' 为真、null 为假
// 2) compareAndSet / compareAndDel 走 EVAL，KEYS[1]=key、ARGV 依次为 expected / value / ttl；1 为真、0 为假
import { RedisKvStore } from '../src/modules/kv/redis-kv.store'

describe('RedisKvStore 条件写入', () => {
  let store: RedisKvStore
  let client: { set: jest.Mock; eval: jest.Mock }

  beforeEach(() => {
    store = new RedisKvStore()
    client = { set: jest.fn(), eval: jest.fn() }
    // 换掉真实连接：lazyConnect 下构造不会发起连接
    ;(store as unknown as { client: unknown }).client = client
  })

  it('setIfAbsent 发 NX 写入并换算返回值', async () => {
    client.set.mockResolvedValueOnce('OK').mockResolvedValueOnce(null)
    expect(await store.setIfAbsent('k', 'v', 900)).toBe(true)
    expect(client.set).toHaveBeenCalledWith('k', 'v', 'PX', 900, 'NX')
    expect(await store.setIfAbsent('k', 'v', 900)).toBe(false)
  })

  it('compareAndSet 按 KEYS / ARGV 顺序传参', async () => {
    client.eval.mockResolvedValueOnce(1).mockResolvedValueOnce(0)
    expect(await store.compareAndSet('k', 'old', 'new', 900)).toBe(true)
    const [script, numKeys, ...args] = client.eval.mock.calls[0]
    expect(script).toContain("'PX'")
    expect(numKeys).toBe(1)
    expect(args).toEqual(['k', 'old', 'new', '900'])
    expect(await store.compareAndSet('k', 'old', 'new', 900)).toBe(false)
  })

  it('compareAndDel 按 KEYS / ARGV 顺序传参', async () => {
    client.eval.mockResolvedValueOnce(1).mockResolvedValueOnce(0)
    expect(await store.compareAndDel('k', 'old')).toBe(true)
    expect(client.eval.mock.calls[0].slice(1)).toEqual([1, 'k', 'old'])
    expect(await store.compareAndDel('k', 'old')).toBe(false)
  })

  it('Redis 故障时转成 503，不静默当作成功', async () => {
    client.eval.mockRejectedValueOnce(new Error('down'))
    await expect(store.compareAndSet('k', 'a', 'b', 1)).rejects.toThrow('服务暂时不可用')
  })
})
