// MemberGuard —— 前台会员鉴权，盯三条红线：
// 1) 管理员令牌不能通过（scope 隔离）2) 禁用/删除的账号旧令牌立即失效
// 3) 改密/重置密码后，改密前签发的令牌失效
import { UnauthorizedException } from '@nestjs/common'
import type { ExecutionContext } from '@nestjs/common'
import type { JwtService } from '@nestjs/jwt'
import type { Repository } from 'typeorm'
import { MemberGuard, type RequestWithMember } from '../src/common/guards/member.guard'
import type { Member } from '../src/modules/member/member.entity'
import { JWT_MEMBER } from '../src/config/app.config'
import { passwordFingerprint } from '../src/common/utils/password-fingerprint'
import type { TokenRevocationService } from '../src/modules/kv/token-revocation.service'

/** 未吊销的令牌黑名单桩 */
function notRevoked(): TokenRevocationService {
  return { isRevoked: jest.fn().mockResolvedValue(false), revoke: jest.fn() } as unknown as TokenRevocationService
}

const HASH = '$2a$10$abcdefghijklmnopqrstuv'

/** 造带 Authorization 头的执行上下文 */
function ctxWithToken(token = 'tok'): { ctx: ExecutionContext; req: RequestWithMember } {
  const req = { headers: { authorization: `Bearer ${token}` } } as unknown as RequestWithMember
  const ctx = { switchToHttp: () => ({ getRequest: () => req }) } as unknown as ExecutionContext
  return { ctx, req }
}

/** 造会员实体，只填守卫会读的字段 */
function memberRow(over: Partial<Member> = {}): Member {
  return { id: 7, phone: '13800000000', status: 'normal', passwordHash: HASH, deletedAt: null, ...over } as Member
}

/** 用给定载荷与库中会员组装守卫 */
function buildGuard(payload: unknown, member: Member | null) {
  const jwt = { verifyAsync: jest.fn().mockResolvedValue(payload) } as unknown as JwtService
  const repo = { findOne: jest.fn().mockResolvedValue(member) } as unknown as Repository<Member>
  return new MemberGuard(jwt, repo, notRevoked())
}

const validPayload = (over: Record<string, unknown> = {}) => ({
  sub: 7, phone: '13800000000', scope: 'member',
  pwd: passwordFingerprint(HASH, JWT_MEMBER.secret), ...over,
})

describe('MemberGuard', () => {
  it('正常会员 + 指纹一致时放行并挂载身份', async () => {
    const { ctx, req } = ctxWithToken()
    await expect(buildGuard(validPayload(), memberRow()).canActivate(ctx)).resolves.toBe(true)
    expect(req.member?.sub).toBe(7)
  })

  it('管理员令牌（scope 不符）拒绝', async () => {
    const { ctx } = ctxWithToken()
    await expect(buildGuard(validPayload({ scope: 'admin' }), memberRow()).canActivate(ctx))
      .rejects.toThrow(UnauthorizedException)
  })

  it('账号已删除（查不到）拒绝', async () => {
    const { ctx } = ctxWithToken()
    await expect(buildGuard(validPayload(), null).canActivate(ctx)).rejects.toThrow(UnauthorizedException)
  })

  it('账号已禁用拒绝', async () => {
    const { ctx } = ctxWithToken()
    await expect(buildGuard(validPayload(), memberRow({ status: 'disabled' })).canActivate(ctx))
      .rejects.toThrow(UnauthorizedException)
  })

  it('密码已变更（哈希不同）拒绝', async () => {
    const { ctx } = ctxWithToken()
    await expect(buildGuard(validPayload(), memberRow({ passwordHash: '$2a$10$changed' })).canActivate(ctx))
      .rejects.toThrow('密码已变更')
  })

  it('无指纹的旧令牌放行至自然过期', async () => {
    const { ctx } = ctxWithToken()
    await expect(buildGuard(validPayload({ pwd: undefined }), memberRow()).canActivate(ctx)).resolves.toBe(true)
  })

  it('令牌验签失败拒绝', async () => {
    const jwt = { verifyAsync: jest.fn().mockRejectedValue(new Error('bad')) } as unknown as JwtService
    const repo = { findOne: jest.fn() } as unknown as Repository<Member>
    const { ctx } = ctxWithToken()
    await expect(new MemberGuard(jwt, repo, notRevoked()).canActivate(ctx)).rejects.toThrow(UnauthorizedException)
  })
})
