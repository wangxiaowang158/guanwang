// ChannelPermGuard —— 栏目级权限守卫，本文件盯的红线：
// 守卫与业务层取 channelKey 的位置不同（守卫 query 优先、业务层多读 body），
// query 与 body 不一致时必须拒绝，否则可「按 A 栏目过守卫、按 B 栏目执行」
import { ForbiddenException } from '@nestjs/common'
import type { ExecutionContext } from '@nestjs/common'
import type { RequestWithAdmin } from '../src/common/guards/admin.guard'
import { ChannelPermGuard } from '../src/modules/cms/guards/channel-perm.guard'
import type { ChannelService } from '../src/modules/cms/channel.service'

/** 栏目桩：栏目 key 即权限名 */
const channels = {
  resolvePermNames: jest.fn(async (key: string) => (['news', 'cases'].includes(key) ? [key] : [])),
} as unknown as ChannelService

/** 只有 news 栏目权限的普通管理员发起的请求 */
function ctx(query: Record<string, unknown>, body: Record<string, unknown>): ExecutionContext {
  const req = { admin: { isSuper: false, perms: ['news'] }, query, body } as unknown as RequestWithAdmin
  return { switchToHttp: () => ({ getRequest: () => req }) } as unknown as ExecutionContext
}

describe('ChannelPermGuard', () => {
  const guard = new ChannelPermGuard(channels)

  it('query 与 body 栏目不一致时拒绝', async () => {
    await expect(guard.canActivate(ctx({ channelKey: 'news' }, { channelKey: 'cases' }))).rejects.toBeInstanceOf(ForbiddenException)
  })

  it('两处一致时按该栏目放行', async () => {
    await expect(guard.canActivate(ctx({ channelKey: 'news' }, { channelKey: 'news' }))).resolves.toBe(true)
  })

  it('只在 body 给出有权限的栏目时放行，无权限栏目拒绝', async () => {
    await expect(guard.canActivate(ctx({}, { channelKey: 'news' }))).resolves.toBe(true)
    await expect(guard.canActivate(ctx({}, { channelKey: 'cases' }))).rejects.toBeInstanceOf(ForbiddenException)
  })
})
