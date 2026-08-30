// 当前会员装饰器 —— 从请求中取出经守卫校验的会员身份
// 业务代码一律通过此装饰器获取会员 id，禁止信任前端传入的 memberId
import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common'
import type { MemberTokenPayload, RequestWithMember } from '../guards/member.guard'

/**
 * 注入当前登录会员的令牌载荷
 * 必须配合 MemberGuard 使用，否则抛未登录异常
 */
export const CurrentMember = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): MemberTokenPayload => {
    const req = ctx.switchToHttp().getRequest<RequestWithMember>()
    if (!req.member) throw new UnauthorizedException('未登录或登录已失效')
    return req.member
  },
)
