// 会员鉴权守卫 —— 校验前台会员令牌，强校验 scope=member
// 双身份隔离红线：管理员令牌绝不能通过此守卫（scope 不匹配即拒绝）
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { InjectRepository } from '@nestjs/typeorm'
import { IsNull, Repository } from 'typeorm'
import type { Request } from 'express'
import { JWT_MEMBER, SCOPE_MEMBER } from '../../config/app.config'
import { MEMBER_STATUS } from '../enums'
import { passwordFingerprint } from '../utils/password-fingerprint'
import { Member } from '../../modules/member/member.entity'
import { TokenRevocationService } from '../../modules/kv/token-revocation.service'
import type { RequestToken } from './admin.guard'

/** 会员令牌载荷 */
export interface MemberTokenPayload {
  sub: number
  phone: string
  scope: typeof SCOPE_MEMBER
  /** 签发时的密码指纹；改密后与库中不符即拒绝。旧令牌无此字段 */
  pwd?: string
  /** 过期时刻（Unix 秒），退出登录时据此设定黑名单存活期 */
  exp?: number
}

/** 挂载会员身份后的请求对象 */
export interface RequestWithMember extends Request {
  member?: MemberTokenPayload
  /** 当前令牌原文与过期时刻，供退出登录吊销 */
  token?: RequestToken
}

@Injectable()
export class MemberGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(Member) private readonly memberRepo: Repository<Member>,
    private readonly revocation: TokenRevocationService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<RequestWithMember>()
    const token = this.extractToken(req)
    if (!token) throw new UnauthorizedException('未登录或登录已失效')

    let payload: MemberTokenPayload
    try {
      payload = await this.jwtService.verifyAsync<MemberTokenPayload>(token, {
        secret: JWT_MEMBER.secret,
      })
    } catch {
      throw new UnauthorizedException('未登录或登录已失效')
    }
    // 作用域强校验：非会员令牌一律拒绝，防止管理端令牌越权访问会员接口
    if (payload.scope !== SCOPE_MEMBER) {
      throw new UnauthorizedException('令牌类型不匹配')
    }

    // 已主动退出的令牌：即便仍在有效期内也拒绝
    if (await this.revocation.isRevoked(token)) {
      throw new UnauthorizedException('未登录或登录已失效')
    }
    req.token = { raw: token, exp: payload.exp }

    // 回库核对账号现状：后台禁用、删除或重置密码后，旧令牌在有效期内必须立即失效，
    // 否则被禁用的会员在令牌到期前（默认 2 小时）仍能提交反馈、改资料
    const member = await this.memberRepo.findOne({ where: { id: payload.sub, deletedAt: IsNull() } })
    if (!member || member.status !== MEMBER_STATUS.NORMAL) {
      throw new UnauthorizedException('账号已被禁用，请联系管理员')
    }
    // 无 pwd 的是本次改动前签发的令牌，放行至其自然过期（最长一个有效期），避免上线即全员掉线
    if (payload.pwd !== undefined && payload.pwd !== passwordFingerprint(member.passwordHash, JWT_MEMBER.secret)) {
      throw new UnauthorizedException('密码已变更，请重新登录')
    }

    req.member = payload
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
