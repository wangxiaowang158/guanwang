// AdminGuard —— 后台鉴权的唯一入口，本文件盯的是三条红线：
// 1) 会员令牌不能通过（scope 隔离）2) 账号删了旧令牌立即失效
// 3) 改密后改密前签发的令牌全部失效
import { UnauthorizedException } from '@nestjs/common'
import type { ExecutionContext } from '@nestjs/common'
import type { JwtService } from '@nestjs/jwt'
import { AdminGuard, type RequestWithAdmin } from '../src/common/guards/admin.guard'
import type { AdminService } from '../src/modules/admin/admin.service'
import type { Admin } from '../src/modules/admin/admin.entity'
import type { TokenRevocationService } from '../src/modules/kv/token-revocation.service'

/** 未吊销的令牌黑名单桩 */
function notRevoked(): TokenRevocationService {
  return { isRevoked: jest.fn().mockResolvedValue(false), revoke: jest.fn() } as unknown as TokenRevocationService
}

/** 造一个带 Authorization 头的执行上下文，并暴露请求对象供断言 */
function ctxWithToken(token?: string): { ctx: ExecutionContext; req: RequestWithAdmin } {
  const req = {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  } as unknown as RequestWithAdmin
  const ctx = {
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext
  return { ctx, req }
}

/** 造管理员实体，只填守卫会读的字段 */
function adminRow(over: Partial<Admin> = {}): Admin {
  return {
    id: 1,
    account: 'admin',
    name: '超级管理员',
    perms: '["内容管理"]',
    isSuper: false,
    pwdChangedAt: 0,
    ...over,
  } as Admin
}

/** 用给定的令牌载荷与库中账号组装守卫 */
function buildGuard(payload: unknown, admin: Admin | null) {
  const jwt = {
    verifyAsync: jest.fn().mockResolvedValue(payload),
  } as unknown as JwtService
  const adminService = {
    findByAccount: jest.fn().mockResolvedValue(admin),
  } as unknown as AdminService
  return { guard: new AdminGuard(jwt, adminService, notRevoked()), jwt, adminService }
}

describe('AdminGuard 令牌提取', () => {
  it('无 Authorization 头时拒绝', async () => {
    const { guard } = buildGuard({}, adminRow())
    const { ctx } = ctxWithToken()
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException)
  })

  it('非 Bearer 类型时拒绝', async () => {
    const { guard } = buildGuard({}, adminRow())
    const req = { headers: { authorization: 'Basic abc123' } } as unknown as RequestWithAdmin
    const ctx = { switchToHttp: () => ({ getRequest: () => req }) } as unknown as ExecutionContext
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException)
  })

  it('令牌验签失败时拒绝，且不暴露验签细节', async () => {
    const jwt = {
      verifyAsync: jest.fn().mockRejectedValue(new Error('jwt malformed')),
    } as unknown as JwtService
    const adminService = { findByAccount: jest.fn() } as unknown as AdminService
    const guard = new AdminGuard(jwt, adminService, notRevoked())

    const { ctx } = ctxWithToken('bad-token')
    await expect(guard.canActivate(ctx)).rejects.toThrow('未登录或登录已失效')
    // 验签没过就不该查库
    expect(adminService.findByAccount).not.toHaveBeenCalled()
  })
})

describe('AdminGuard scope 隔离（双身份红线）', () => {
  it('会员令牌不能通过管理员守卫', async () => {
    const { guard, adminService } = buildGuard(
      { sub: 1, account: 'admin', scope: 'member', pwd: 0 },
      adminRow(),
    )
    const { ctx } = ctxWithToken('member-token')

    await expect(guard.canActivate(ctx)).rejects.toThrow('令牌类型不匹配')
    // scope 不符就该当场拒绝，不进入查库环节
    expect(adminService.findByAccount).not.toHaveBeenCalled()
  })

  it('缺 scope 字段的令牌不能通过', async () => {
    const { guard } = buildGuard({ sub: 1, account: 'admin', pwd: 0 }, adminRow())
    const { ctx } = ctxWithToken('no-scope')
    await expect(guard.canActivate(ctx)).rejects.toThrow('令牌类型不匹配')
  })
})

describe('AdminGuard 账号状态校验', () => {
  it('账号已删除时旧令牌失效', async () => {
    const { guard } = buildGuard({ sub: 1, account: 'ghost', scope: 'admin', pwd: 0 }, null)
    const { ctx } = ctxWithToken('t')
    await expect(guard.canActivate(ctx)).rejects.toThrow('未登录或登录已失效')
  })

  it('账号名被他人复用（id 不符）时拒绝', async () => {
    // 删号后又建了同名账号：令牌里的 sub 与库里新 id 不同，必须拒绝
    const { guard } = buildGuard(
      { sub: 1, account: 'admin', scope: 'admin', pwd: 0 },
      adminRow({ id: 99 }),
    )
    const { ctx } = ctxWithToken('t')
    await expect(guard.canActivate(ctx)).rejects.toThrow('未登录或登录已失效')
  })
})

describe('AdminGuard 改密即失效', () => {
  it('改密前签发的令牌被拒', async () => {
    const { guard } = buildGuard(
      { sub: 1, account: 'admin', scope: 'admin', pwd: 1000 },
      adminRow({ pwdChangedAt: 2000 }),
    )
    const { ctx } = ctxWithToken('old-token')
    await expect(guard.canActivate(ctx)).rejects.toThrow('密码已变更，请重新登录')
  })

  it('改密后签发的令牌放行', async () => {
    const { guard } = buildGuard(
      { sub: 1, account: 'admin', scope: 'admin', pwd: 2000 },
      adminRow({ pwdChangedAt: 2000 }),
    )
    const { ctx } = ctxWithToken('new-token')
    await expect(guard.canActivate(ctx)).resolves.toBe(true)
  })

  it('加列前签发的旧令牌（无 pwd 字段）与存量账号（pwdChangedAt=0）视为相等，不被误踢', async () => {
    const { guard } = buildGuard(
      { sub: 1, account: 'admin', scope: 'admin' },
      adminRow({ pwdChangedAt: 0 }),
    )
    const { ctx } = ctxWithToken('legacy')
    await expect(guard.canActivate(ctx)).resolves.toBe(true)
  })

  it('无 pwd 字段的旧令牌遇到已改密账号仍被踢', async () => {
    const { guard } = buildGuard(
      { sub: 1, account: 'admin', scope: 'admin' },
      adminRow({ pwdChangedAt: 3000 }),
    )
    const { ctx } = ctxWithToken('legacy')
    await expect(guard.canActivate(ctx)).rejects.toThrow('密码已变更，请重新登录')
  })
})

describe('AdminGuard 身份挂载', () => {
  it('通过后把当前权限挂到请求上，且权限取自库而非令牌', async () => {
    const { guard } = buildGuard(
      // 令牌里故意塞一份过期权限快照，守卫不应采用
      { sub: 1, account: 'admin', scope: 'admin', pwd: 0, perms: ['全部权限'] },
      adminRow({ perms: '["内容管理","会员中心"]', isSuper: false }),
    )
    const { ctx, req } = ctxWithToken('t')

    await expect(guard.canActivate(ctx)).resolves.toBe(true)
    expect(req.admin).toEqual({
      id: 1,
      account: 'admin',
      name: '超级管理员',
      perms: ['内容管理', '会员中心'],
      isSuper: false,
    })
  })

  it('perms 字段为非法 JSON 时降级为空数组而不是抛错', async () => {
    const { guard } = buildGuard(
      { sub: 1, account: 'admin', scope: 'admin', pwd: 0 },
      adminRow({ perms: '{不是数组' }),
    )
    const { ctx, req } = ctxWithToken('t')

    await expect(guard.canActivate(ctx)).resolves.toBe(true)
    expect(req.admin?.perms).toEqual([])
  })
})
