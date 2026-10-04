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
import { TokenRevocationService } from '../../modules/kv/token-revocation.service'

/** 管理员令牌载荷；权限不入令牌，避免签发后权限变更无法生效 */
export interface AdminTokenPayload {
  sub: number
  account: string
  scope: typeof SCOPE_ADMIN
  /**
   * 签发时该账号的密码变更时刻（Unix 秒）
   * 改密后库里的值会前移，与此不符的令牌即被判为过期。
   * 可选：加列之前签发的旧令牌没有此字段，按 0 处理以平滑过渡
   */
  pwd?: number
  /** 过期时刻（Unix 秒），由 jsonwebtoken 签发时写入；退出登录时据此设定黑名单存活期 */
  exp?: number
}

/** 守卫挂到请求上的令牌原文与过期时刻，供退出登录吊销当前令牌 */
export interface RequestToken {
  raw: string
  exp?: number
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
  token?: RequestToken
}

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly adminService: AdminService,
    private readonly revocation: TokenRevocationService,
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

    // 已主动退出的令牌：即便仍在有效期内也拒绝
    if (await this.revocation.isRevoked(token)) {
      throw new UnauthorizedException('未登录或登录已失效')
    }
    req.token = { raw: token, exp: payload.exp }

    // 账号可能已被删除，此时旧令牌必须失效
    const admin = await this.adminService.findByAccount(payload.account)
    if (!admin || admin.id !== payload.sub) {
      throw new UnauthorizedException('未登录或登录已失效')
    }

    // 密码变更后，改密前签发的令牌一律失效。
    // 否则改密挤不掉已泄露的会话——旧令牌在有效期内（默认 8 小时）仍可用，
    // 而「发现账号可能泄露就改密码」正是改密最主要的用途。
    // 两侧都用 ?? 0 兜底：加列前签发的旧令牌无 pwd 字段，存量账号该列为 0，
    // 相等故不被误踢，可平滑上线
    if ((payload.pwd ?? 0) !== (admin.pwdChangedAt ?? 0)) {
      throw new UnauthorizedException('密码已变更，请重新登录')
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
