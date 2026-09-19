// 管理员认证服务 —— 登录校验与令牌签发（scope=admin）
// 安全要点：失败提示统一为「账号或密码错误」，不区分账号不存在与密码错误，防账号枚举
import { Injectable } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { JWT_ADMIN, SCOPE_ADMIN } from '../../config/app.config'
import type { Admin } from './admin.entity'
import { AdminService } from './admin.service'
import { toAdminProfileVo, type AdminProfileVo } from './vo/admin.vo'

/** 登录成功返回体 */
export interface AdminLoginResult {
  token: string
  username: string
  profile: AdminProfileVo
}

@Injectable()
export class AdminAuthService {
  constructor(
    private readonly adminService: AdminService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * 管理员登录
   * @returns 凭证无效时返回 null，由控制器统一转 401
   */
  async login(username: string, password: string): Promise<AdminLoginResult | null> {
    const admin = await this.adminService.verifyCredentials(username, password)
    if (!admin) return null

    return {
      token: await this.sign(admin),
      username: admin.account,
      profile: toAdminProfileVo(admin),
    }
  }

  /** 签发管理员令牌，scope 固定为 admin；权限不入载荷，由守卫每次回库读取 */
  private sign(admin: Admin): Promise<string> {
    return this.jwtService.signAsync(
      { sub: admin.id, account: admin.account, scope: SCOPE_ADMIN },
      {
        secret: JWT_ADMIN.secret,
        // 配置读出为宽泛 string，jsonwebtoken 要求时长字面量类型，此处按其签名收窄
        expiresIn: JWT_ADMIN.expiresIn as `${number}${'s' | 'm' | 'h' | 'd'}`,
      },
    )
  }
}
