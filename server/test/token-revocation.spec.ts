// 令牌吊销 —— 退出登录后令牌须立即失效
// 盯三件事：吊销后守卫拒绝、存活期与令牌剩余有效期一致、已过期令牌不占存储
import { UnauthorizedException } from '@nestjs/common'
import type { ExecutionContext } from '@nestjs/common'
import type { JwtService } from '@nestjs/jwt'
import type { Repository } from 'typeorm'
import { TokenRevocationService } from '../src/modules/kv/token-revocation.service'
import { MemoryKvStore } from '../src/modules/kv/memory-kv.store'
import { MemberGuard, type RequestWithMember } from '../src/common/guards/member.guard'
import type { Member } from '../src/modules/member/member.entity'

const nowSec = () => Math.floor(Date.now() / 1000)

describe('TokenRevocationService', () => {
  it('吊销后 isRevoked 为真，其他令牌不受影响', async () => {
    const kv = new MemoryKvStore()
    const svc = new TokenRevocationService(kv)
    await svc.revoke('token-a', nowSec() + 3600)
    await expect(svc.isRevoked('token-a')).resolves.toBe(true)
    await expect(svc.isRevoked('token-b')).resolves.toBe(false)
    kv.onModuleDestroy()
  })

  it('已过期或缺 exp 的令牌不写入黑名单', async () => {
    const kv = new MemoryKvStore()
    const set = jest.spyOn(kv, 'set')
    const svc = new TokenRevocationService(kv)
    await svc.revoke('old', nowSec() - 10)
    await svc.revoke('no-exp', undefined)
    expect(set).not.toHaveBeenCalled()
    kv.onModuleDestroy()
  })

  it('黑名单存活期等于令牌剩余有效期，且不存令牌原文', async () => {
    const kv = new MemoryKvStore()
    const set = jest.spyOn(kv, 'set')
    const svc = new TokenRevocationService(kv)
    await svc.revoke('secret-token', nowSec() + 600)
    const [key, , ttl] = set.mock.calls[0]
    expect(key).not.toContain('secret-token')
    expect(ttl).toBeGreaterThan(590_000)
    expect(ttl).toBeLessThanOrEqual(600_000)
    kv.onModuleDestroy()
  })
})

describe('MemberGuard 吊销核对', () => {
  it('已吊销的令牌即便验签通过也拒绝', async () => {
    const kv = new MemoryKvStore()
    const revocation = new TokenRevocationService(kv)
    await revocation.revoke('tok', nowSec() + 3600)
    const jwt = {
      verifyAsync: jest.fn().mockResolvedValue({ sub: 1, phone: 'x', scope: 'member', exp: nowSec() + 3600 }),
    } as unknown as JwtService
    const repo = { findOne: jest.fn() } as unknown as Repository<Member>
    const req = { headers: { authorization: 'Bearer tok' } } as unknown as RequestWithMember
    const ctx = { switchToHttp: () => ({ getRequest: () => req }) } as unknown as ExecutionContext
    await expect(new MemberGuard(jwt, repo, revocation).canActivate(ctx)).rejects.toThrow(UnauthorizedException)
    // 吊销判定先于回库：被吊销的令牌不该再查会员表
    expect(repo.findOne).not.toHaveBeenCalled()
    kv.onModuleDestroy()
  })
})
