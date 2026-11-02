// 内容编辑锁 —— 盯这几件事：
// 1) 他人持锁时拿不到锁、保存被拒，并能看到是谁在编辑；两人同时抢只有一人拿到
// 2) 本人重复加锁算续约，开始时间不变；只能解自己的锁；多开标签页关一页不放锁
// 3) 租约到期自动释放；KV 故障时放行，不把后台锁死
import { ConflictException } from '@nestjs/common'
import type { CurrentAdminInfo } from '../src/common/guards/admin.guard'
import { EDIT_LOCK_TTL_MS, EditLockService } from '../src/modules/cms/edit-lock.service'
import type { KvStore } from '../src/modules/kv/kv-store.interface'
import { MemoryKvStore } from '../src/modules/kv/memory-kv.store'

const alice: CurrentAdminInfo = { id: 1, account: 'alice', name: '张三', perms: [], isSuper: false }
const bob: CurrentAdminInfo = { id: 2, account: 'bob', name: '李四', perms: [], isSuper: false }
const TAB_A = 'tab-aaaa'
const TAB_B = 'tab-bbbb'

describe('EditLockService', () => {
  let kv: MemoryKvStore
  let locks: EditLockService

  beforeEach(() => {
    kv = new MemoryKvStore()
    locks = new EditLockService(kv)
  })
  afterEach(() => kv.onModuleDestroy())

  it('他人持锁时拿不到锁，返回占用人；保存被拒并提示占用人', async () => {
    expect((await locks.acquire('news', 7, alice, TAB_A)).acquired).toBe(true)
    const res = await locks.acquire('news', 7, bob, TAB_B)
    expect(res.acquired).toBe(false)
    expect(res.holder?.name).toBe('张三')
    expect(res.holder).not.toHaveProperty('tabs')
    await expect(locks.assertWritable('news', 7, bob)).rejects.toThrow(ConflictException)
    await expect(locks.assertWritable('news', 7, bob)).rejects.toThrow(/张三/)
    await expect(locks.assertWritable('news', 7, alice)).resolves.toBeUndefined()
  })

  it('两人同时抢同一条内容，只有一人拿到锁', async () => {
    const [a, b] = await Promise.all([
      locks.acquire('news', 7, alice, TAB_A),
      locks.acquire('news', 7, bob, TAB_B),
    ])
    expect([a.acquired, b.acquired].filter(Boolean)).toHaveLength(1)
  })

  it('锁按栏目 + 内容区分，不同内容互不影响', async () => {
    await locks.acquire('news', 7, alice, TAB_A)
    expect((await locks.acquire('news', 8, bob, TAB_B)).acquired).toBe(true)
    expect((await locks.acquire('cases', 7, bob, TAB_B)).acquired).toBe(true)
  })

  it('本人重复加锁为续约，开始时间不变；他人解不了别人的锁', async () => {
    const first = await locks.acquire('news', 7, alice, TAB_A)
    const again = await locks.acquire('news', 7, alice, TAB_A)
    expect(again.acquired).toBe(true)
    expect(again.holder?.since).toBe(first.holder?.since)
    await locks.release('news', 7, bob, TAB_B)
    expect((await locks.acquire('news', 7, bob, TAB_B)).acquired).toBe(false)
    await locks.release('news', 7, alice, TAB_A)
    expect((await locks.acquire('news', 7, bob, TAB_B)).acquired).toBe(true)
  })

  it('本人多开标签页：关掉一页不放锁，全部关掉才释放', async () => {
    await locks.acquire('news', 7, alice, TAB_A)
    await locks.acquire('news', 7, alice, TAB_B)
    await locks.release('news', 7, alice, TAB_A)
    expect((await locks.acquire('news', 7, bob, 'tab-cccc')).acquired).toBe(false)
    await locks.release('news', 7, alice, TAB_B)
    expect((await locks.acquire('news', 7, bob, 'tab-cccc')).acquired).toBe(true)
  })

  it('批量操作中任一条被他人编辑即整批拒绝，提示占用人；本人持锁的不挡', async () => {
    await locks.acquire('news', 7, alice, TAB_A)
    await expect(locks.assertManyWritable('news', [6, 7, 8], bob)).rejects.toThrow(/张三/)
    await expect(locks.assertManyWritable('news', [6, 7, 8], alice)).resolves.toBeUndefined()
    await expect(locks.assertManyWritable('news', [6, 8], bob)).resolves.toBeUndefined()
  })

  it('租约到期自动释放；不再续约的标签页不会挡住解锁', async () => {
    jest.useFakeTimers({ now: Date.now() })
    try {
      await locks.acquire('news', 7, alice, TAB_A)
      jest.setSystemTime(Date.now() + EDIT_LOCK_TTL_MS + 1)
      expect((await locks.acquire('news', 7, bob, TAB_B)).acquired).toBe(true)

      // 张三两页，A 页崩溃不再续约，B 页续约后离开：A 已过期不算数，锁应释放
      await locks.release('news', 7, bob, TAB_B)
      await locks.acquire('news', 8, alice, TAB_A)
      jest.setSystemTime(Date.now() + EDIT_LOCK_TTL_MS - 1000)
      await locks.acquire('news', 8, alice, TAB_B)
      jest.setSystemTime(Date.now() + 2000)
      await locks.release('news', 8, alice, TAB_B)
      expect((await locks.acquire('news', 8, bob, TAB_B)).acquired).toBe(true)
    } finally {
      jest.useRealTimers()
    }
  })

  it('读到本人锁后它被别人接手：续约与解锁都不覆盖、不误删对方', async () => {
    await locks.acquire('news', 7, alice, TAB_A)
    const stale = await kv.get('edit-lock:news:7')
    // 模拟读到之后锁到期、被李四抢到：比对原值的写入 / 删除都应失败
    await kv.del('edit-lock:news:7')
    await locks.acquire('news', 7, bob, TAB_B)
    expect(await kv.compareAndSet('edit-lock:news:7', stale!, 'x', EDIT_LOCK_TTL_MS)).toBe(false)
    expect(await kv.compareAndDel('edit-lock:news:7', stale!)).toBe(false)
    await locks.release('news', 7, alice, TAB_A)
    expect((await locks.acquire('news', 7, alice, TAB_A)).holder?.name).toBe('李四')
  })

  it('本人两个标签页同时续约，两页都登记在册，关一页不放锁', async () => {
    await locks.acquire('news', 7, alice, TAB_A)
    await Promise.all([locks.acquire('news', 7, alice, TAB_A), locks.acquire('news', 7, alice, TAB_B)])
    await locks.release('news', 7, alice, TAB_A)
    expect((await locks.acquire('news', 7, bob, 'tab-cccc')).acquired).toBe(false)
  })

  it('条件写入一直被打断时，本标签页没登记上就不报持锁，也不显示占用人', async () => {
    await locks.acquire('news', 7, alice, TAB_A)
    const realCas = kv.compareAndSet.bind(kv)
    const cas = jest.spyOn(kv, 'compareAndSet').mockResolvedValue(false)
    const res = await locks.acquire('news', 7, alice, TAB_B)
    expect(res).toEqual({ acquired: false, holder: null })
    // 已登记的标签页照常报持锁
    expect((await locks.acquire('news', 7, alice, TAB_A)).acquired).toBe(true)
    cas.mockImplementation(realCas)
  })

  it('解锁后剩余标签页的租约不被续满', async () => {
    jest.useFakeTimers({ now: Date.now() })
    try {
      await locks.acquire('news', 7, alice, TAB_A)
      jest.setSystemTime(Date.now() + 60_000)
      await locks.acquire('news', 7, alice, TAB_B)
      // A 页还剩约 30 秒、B 页 90 秒；B 离开后锁应跟着 A 在约 30 秒后到期
      await locks.release('news', 7, alice, TAB_B)
      jest.setSystemTime(Date.now() + 31_000)
      expect((await locks.acquire('news', 7, bob, 'tab-cccc')).acquired).toBe(true)
    } finally {
      jest.useRealTimers()
    }
  })

  it('锁值是脏数据时可正常加锁，不被永久锁死', async () => {
    await kv.set('edit-lock:news:7', 'not-json', EDIT_LOCK_TTL_MS)
    expect((await locks.acquire('news', 7, bob, TAB_B)).acquired).toBe(true)
    expect((await locks.acquire('news', 7, alice, TAB_A)).acquired).toBe(false)
  })

  it('KV 故障时放行，不阻断编辑与保存', async () => {
    const down = jest.fn().mockRejectedValue(new Error('down'))
    const broken = { get: down, setIfAbsent: down, compareAndSet: down, compareAndDel: down } as unknown as KvStore
    const svc = new EditLockService(broken)
    expect((await svc.acquire('news', 7, bob, TAB_B)).acquired).toBe(true)
    await expect(svc.assertWritable('news', 7, bob)).resolves.toBeUndefined()
  })
})
