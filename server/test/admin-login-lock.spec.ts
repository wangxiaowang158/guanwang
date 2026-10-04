// 管理员登录失败锁定 —— 按 IP 的限流挡不住换 IP 撞库，按账号计数是第二道闸
// 盯四件事：达阈值锁定、锁定期内正确密码也拒、成功清零、不存在的账号同样计数（防枚举）
import type { JwtService } from '@nestjs/jwt'
import { AdminAuthService } from '../src/modules/admin/admin-auth.service'
import type { AdminService } from '../src/modules/admin/admin.service'
import type { Admin } from '../src/modules/admin/admin.entity'
import { MemoryKvStore } from '../src/modules/kv/memory-kv.store'

const ADMIN = { id: 1, account: 'admin', name: '超管', perms: '[]', isSuper: true, pwdChangedAt: 0 } as Admin

/** 组装服务：密码为 good 时校验通过 */
function build() {
  const kv = new MemoryKvStore()
  const adminService = {
    verifyCredentials: jest.fn(async (_u: string, p: string) => (p === 'good' ? ADMIN : null)),
  } as unknown as AdminService
  const jwt = { signAsync: jest.fn().mockResolvedValue('token') } as unknown as JwtService
  return { svc: new AdminAuthService(adminService, jwt, kv), kv, adminService }
}

describe('AdminAuthService 登录锁定', () => {
  it('连续失败 5 次后锁定，锁定期内正确密码也拒绝', async () => {
    const { svc, kv } = build()
    for (let i = 0; i < 5; i += 1) {
      await expect(svc.login('admin', 'bad', '1.1.1.1')).resolves.toBe('invalid')
    }
    await expect(svc.login('admin', 'good', '1.1.1.1')).resolves.toEqual({ lockedMinutes: 10 })
    kv.onModuleDestroy()
  })

  it('锁定期内不再校验密码（不给爆破者任何反馈）', async () => {
    const { svc, kv, adminService } = build()
    for (let i = 0; i < 5; i += 1) await svc.login('admin', 'bad', null)
    const calls = (adminService.verifyCredentials as jest.Mock).mock.calls.length
    await svc.login('admin', 'good', null)
    expect((adminService.verifyCredentials as jest.Mock).mock.calls.length).toBe(calls)
    kv.onModuleDestroy()
  })

  it('成功登录清零失败计数', async () => {
    const { svc, kv } = build()
    for (let i = 0; i < 4; i += 1) await svc.login('admin', 'bad', null)
    const ok = await svc.login('admin', 'good', null)
    expect(typeof ok === 'object' && 'token' in ok).toBe(true)
    for (let i = 0; i < 4; i += 1) await svc.login('admin', 'bad', null)
    // 若未清零，此时已累计 8 次，会返回锁定
    await expect(svc.login('admin', 'bad', null)).resolves.toBe('invalid')
    kv.onModuleDestroy()
  })

  it('不存在的账号同样计数并锁定，账号名大小写视为同一个', async () => {
    const { svc, kv } = build()
    for (let i = 0; i < 5; i += 1) await svc.login('Ghost', 'x', null)
    await expect(svc.login('ghost', 'x', null)).resolves.toEqual({ lockedMinutes: 10 })
    kv.onModuleDestroy()
  })

  it('他人 IP 的失败不会锁住本人（防恶意锁号）', async () => {
    const { svc, kv } = build()
    for (let i = 0; i < 5; i += 1) await svc.login('admin', 'bad', '6.6.6.6')
    await expect(svc.login('admin', 'good', '6.6.6.6')).resolves.toEqual({ lockedMinutes: 10 })
    const ok = await svc.login('admin', 'good', '1.2.3.4')
    expect(typeof ok === 'object' && 'token' in ok).toBe(true)
    kv.onModuleDestroy()
  })

  it('并发错误请求逐次计数，不会因读写竞态少记', async () => {
    const { svc, kv } = build()
    await Promise.all(Array.from({ length: 5 }, () => svc.login('admin', 'bad', '9.9.9.9')))
    await expect(svc.login('admin', 'good', '9.9.9.9')).resolves.toEqual({ lockedMinutes: 10 })
    kv.onModuleDestroy()
  })
})
