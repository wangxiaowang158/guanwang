// 管理员认证服务 —— 登录校验与令牌签发（scope=admin）
// 安全要点：失败提示统一为「账号或密码错误」，不区分账号不存在与密码错误，防账号枚举
import { Inject, Injectable, Logger } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { JWT_ADMIN, SCOPE_ADMIN } from '../../config/app.config'
import { KV_STORE, type KvStore } from '../kv/kv-store.interface'

/** 失败计数键前缀；计数键 TTL 即锁定时长，到期自动解锁 */
const FAIL_KEY_PREFIX = 'admin-login-fail:'

/** 连续失败多少次锁定、窗口多长：与 SRS 3.5.4「5 次 / 10 分钟」一致，前端冷却倒计时同口径 */
const LOGIN_LOCK = { threshold: 5, minutes: 10 }
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
  private readonly logger = new Logger('AdminLogin')

  constructor(
    private readonly adminService: AdminService,
    private readonly jwtService: JwtService,
    @Inject(KV_STORE) private readonly kv: KvStore,
  ) {}

  /**
   * 管理员登录
   * 按「账号 + IP」计失败次数，达阈值即锁定该组合一段时间，锁定期内正确密码也拒绝。
   * 不只按账号计：那样任何人知道账号名就能从别处持续把超管锁在门外（拒绝服务）。
   * 换 IP 撞库由此变成「每个 IP 每 15 分钟最多猜 5 次」，配合按 IP 的限流已足够昂贵
   * @param ip 请求方地址，计数维度之一并用于审计日志
   * @returns 成功返回令牌；凭证无效返回 'invalid'；锁定中返回锁定分钟数
   */
  async login(
    username: string,
    password: string,
    ip: string | null,
  ): Promise<AdminLoginResult | 'invalid' | { lockedMinutes: number }> {
    const failKey = `${FAIL_KEY_PREFIX}${username.trim().toLowerCase()}:${ip ?? '-'}`
    const failures = Number(await this.kv.get(failKey)) || 0
    if (failures >= LOGIN_LOCK.threshold) {
      this.audit('locked', username, ip)
      return { lockedMinutes: LOGIN_LOCK.minutes }
    }

    const admin = await this.adminService.verifyCredentials(username, password)
    if (!admin) {
      // 账号不存在也照样计数：若只给存在的账号计数，「会不会被锁」就成了探测账号是否存在的信号。
      // 用原子自增：并发的错误请求若 get+set 只会记成 1 次
      await this.kv.incr(failKey, LOGIN_LOCK.minutes * 60_000)
      this.audit('failure', username, ip)
      return 'invalid'
    }

    await this.kv.del(failKey)
    this.audit('success', admin.account, ip)
    return {
      token: await this.sign(admin),
      username: admin.account,
      profile: toAdminProfileVo(admin),
    }
  }

  /**
   * 登录审计：后台登录不进操作日志（op-log 只记写操作），至少落到服务日志里，
   * 出事时能按账号与 IP 追查。不记录密码
   */
  private audit(result: 'success' | 'failure' | 'locked', account: string, ip: string | null): void {
    const line = `管理员登录 ${result} account=${account.slice(0, 50)} ip=${ip ?? '-'}`
    if (result === 'success') this.logger.log(line)
    else this.logger.warn(line)
  }

  /** 签发管理员令牌，scope 固定为 admin；权限不入载荷，由守卫每次回库读取 */
  private sign(admin: Admin): Promise<string> {
    return this.jwtService.signAsync(
      // pwd 带上签发时的密码变更时刻，改密后旧令牌即因此值不符而失效
      { sub: admin.id, account: admin.account, scope: SCOPE_ADMIN, pwd: admin.pwdChangedAt },
      {
        secret: JWT_ADMIN.secret,
        // 配置读出为宽泛 string，jsonwebtoken 要求时长字面量类型，此处按其签名收窄
        expiresIn: JWT_ADMIN.expiresIn as `${number}${'s' | 'm' | 'h' | 'd'}`,
      },
    )
  }
}
