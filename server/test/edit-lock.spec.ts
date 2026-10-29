// 内容编辑锁 —— 盯三件事：
// 1) 他人持锁时拿不到锁、保存被拒，并能看到是谁在编辑
// 2) 本人重复加锁算续约（多开标签页），开始时间不变；只能解自己的锁
// 3) 租约到期自动释放；KV 故障时放行，不把后台锁死
import { ConflictException } from '@nestjs/common'
import type { CurrentAdminInfo } from '../src/common/guards/admin.guard'
import { EDIT_LOCK_TTL_MS, EditLockService } from '../src/modules/cms/edit-lock.service'
import type { KvStore } from '../src/modules/kv/kv-store.interface'
import { MemoryKvStore } from '../src/modules/kv/memory-kv.store'

const alice: CurrentAdminInfo = { id: 1, account: 'alice', name: '张三', perms: [], isSuper: false }
const bob: CurrentAdminInfo = { id: 2, account: 'bob', name: '李四', perms: [], isSuper: false }

describe('EditLockService', () => {
  let kv: MemoryKvStore
  let locks: EditLockService

  beforeEach(() => {
    kv = new MemoryKvStore()
    locks = new EditLockService(kv)
  })
  afterEach(() => kv.onModuleDestroy())

  it('他人持锁时拿不到锁，返回占用人；保存被拒并提示占用人', async () => {
    expect((await locks.acquire('news', 7, alice)).acquired).toBe(true)
    const res = await locks.acquire('news', 7, bob)
    expect(res.acquired).toBe(false)
    expect(res.holder?.name).toBe('张三')
    await expect(locks.assertWritable('news', 7, bob)).rejects.toThrow(ConflictException)
    await expect(locks.assertWritable('news', 7, bob)).rejects.toThrow(/张三/)
    await expect(locks.assertWritable('news', 7, alice)).resolves.toBeUndefined()
  })

  it('锁按栏目 + 内容区分，不同内容互不影响', async () => {
    await locks.acquire('news', 7, alice)
    expect((await locks.acquire('news', 8, bob)).acquired).toBe(true)
    expect((await locks.acquire('cases', 7, bob)).acquired).toBe(true)
  })

  it('本人重复加锁为续约，开始时间不变；他人解不了别人的锁', async () => {
    const first = await locks.acquire('news', 7, alice)
    const again = await locks.acquire('news', 7, alice)
    expect(again.acquired).toBe(true)
    expect(again.holder?.since).toBe(first.holder?.since)
    await locks.release('news', 7, bob)
    expect((await locks.acquire('news', 7, bob)).acquired).toBe(false)
    await locks.release('news', 7, alice)
    expect((await locks.acquire('news', 7, bob)).acquired).toBe(true)
  })

  it('批量操作中任一条被他人编辑即整批拒绝，提示占用人；本人持锁的不挡', async () => {
    await locks.acquire('news', 7, alice)
    await expect(locks.assertManyWritable('news', [6, 7, 8], bob)).rejects.toThrow(/张三/)
    await expect(locks.assertManyWritable('news', [6, 7, 8], alice)).resolves.toBeUndefined()
    await expect(locks.assertManyWritable('news', [6, 8], bob)).resolves.toBeUndefined()
  })

  it('租约到期自动释放', async () => {
    jest.useFakeTimers({ now: Date.now() })
    try {
      await locks.acquire('news', 7, alice)
      jest.setSystemTime(Date.now() + EDIT_LOCK_TTL_MS + 1)
      expect((await locks.acquire('news', 7, bob)).acquired).toBe(true)
    } finally {
      jest.useRealTimers()
    }
  })

  it('KV 故障时放行，不阻断编辑与保存', async () => {
    const broken = { get: jest.fn().mockRejectedValue(new Error('down')) } as unknown as KvStore
    const svc = new EditLockService(broken)
    expect((await svc.acquire('news', 7, bob)).acquired).toBe(true)
    await expect(svc.assertWritable('news', 7, bob)).resolves.toBeUndefined()
  })
})
