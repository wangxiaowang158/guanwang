// 当前管理员装饰器 —— 从请求中取出经守卫校验的管理员身份
// 业务代码一律通过此装饰器获取管理员 id/名称，禁止信任前端传入的身份字段
import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common'
import type { CurrentAdminInfo, RequestWithAdmin } from '../guards/admin.guard'

/**
 * 注入当前登录管理员信息
 * 必须配合 AdminGuard 使用，否则抛未登录异常
 */
export const CurrentAdmin = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentAdminInfo => {
    const req = ctx.switchToHttp().getRequest<RequestWithAdmin>()
    if (!req.admin) throw new UnauthorizedException('未登录或登录已失效')
    return req.admin
  },
)
