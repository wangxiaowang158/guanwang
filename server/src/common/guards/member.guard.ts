// 会员鉴权守卫 —— 校验前台会员令牌，强校验 scope=member
// 双身份隔离红线：管理员令牌绝不能通过此守卫（scope 不匹配即拒绝）
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import type { Request } from 'express'
import { JWT_MEMBER, SCOPE_MEMBER } from '../../config/app.config'

/** 会员令牌载荷 */
export interface MemberTokenPayload {
  sub: number
  phone: string
  scope: typeof SCOPE_MEMBER
}

/** 挂载会员身份后的请求对象 */
export interface RequestWithMember extends Request {
  member?: MemberTokenPayload
}

@Injectable()
export class MemberGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<RequestWithMember>()
    const token = this.extractToken(req)
    if (!token) throw new UnauthorizedException('未登录或登录已失效')

    try {
      const payload = await this.jwtService.verifyAsync<MemberTokenPayload>(token, {
        secret: JWT_MEMBER.secret,
      })
      // 作用域强校验：非会员令牌一律拒绝，防止管理端令牌越权访问会员接口
      if (payload.scope !== SCOPE_MEMBER) {
        throw new UnauthorizedException('令牌类型不匹配')
      }
      req.member = payload
      return true
    } catch {
      throw new UnauthorizedException('未登录或登录已失效')
    }
  }

  /** 从 Authorization 头提取 Bearer 令牌 */
  private extractToken(req: Request): string | null {
    const auth = req.headers.authorization
    if (!auth) return null
    const [type, value] = auth.split(' ')
    return type === 'Bearer' && value ? value : null
  }
}
