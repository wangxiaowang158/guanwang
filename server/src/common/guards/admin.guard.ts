// 管理员鉴权守卫 —— 校验后台管理员令牌，强校验 scope=admin
// 双身份隔离红线：会员令牌绝不能通过此守卫（scope 不匹配即拒绝）
//
// 每次请求都回库取当前权限，不信任令牌里的权限快照：
// 后台调整某账号权限后立即生效，无需等其令牌过期。
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import type { Request } from 'express'
import { JWT_ADMIN, SCOPE_ADMIN } from '../../config/app.config'
import { AdminService } from '../../modules/admin/admin.service'
import { parsePerms } from '../../modules/admin/vo/admin.vo'

/** 管理员令牌载荷；权限不入令牌，避免签发后权限变更无法生效 */
export interface AdminTokenPayload {
  sub: number
  account: string
  scope: typeof SCOPE_ADMIN
}

/** 经守卫校验后挂到请求上的管理员身份 */
export interface CurrentAdminInfo {
  id: number
  account: string
  name: string
  perms: string[]
  isSuper: boolean
}

/** 挂载管理员身份后的请求对象 */
export interface RequestWithAdmin extends Request {
  admin?: CurrentAdminInfo
}

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly adminService: AdminService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<RequestWithAdmin>()
    const token = this.extractToken(req)
    if (!token) throw new UnauthorizedException('未登录或登录已失效')

    let payload: AdminTokenPayload
    try {
      payload = await this.jwtService.verifyAsync<AdminTokenPayload>(token, {
        secret: JWT_ADMIN.secret,
      })
    } catch {
      throw new UnauthorizedException('未登录或登录已失效')
    }

    // 作用域强校验：非管理员令牌一律拒绝，防止会员令牌越权访问管理接口
    if (payload.scope !== SCOPE_ADMIN) {
      throw new UnauthorizedException('令牌类型不匹配')
    }

    // 账号可能已被删除，此时旧令牌必须失效
    const admin = await this.adminService.findByAccount(payload.account)
    if (!admin || admin.id !== payload.sub) {
      throw new UnauthorizedException('未登录或登录已失效')
    }

    req.admin = {
      id: admin.id,
      account: admin.account,
      name: admin.name,
      perms: parsePerms(admin.perms),
      isSuper: admin.isSuper,
    }
    return true
  }

  /** 从 Authorization 头提取 Bearer 令牌 */
  private extractToken(req: Request): string | null {
    const auth = req.headers.authorization
    if (!auth) return null
    const [type, value] = auth.split(' ')
    return type === 'Bearer' && value ? value : null
  }
}
