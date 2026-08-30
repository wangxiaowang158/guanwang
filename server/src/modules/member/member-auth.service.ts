// 会员认证服务 —— 注册、登录、重置密码
// 安全要点：bcrypt 哈希、账号枚举防护（失败提示统一）、失败锁定、令牌 scope=member
import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { JwtService } from '@nestjs/jwt'
import { IsNull, Repository } from 'typeorm'
import { compare, hash } from 'bcryptjs'
import { Member } from './member.entity'
import { SmsCodeService } from './sms-code.service'
import { CaptchaService } from './captcha.service'
import { AuthConfigService } from '../auth-config/auth-config.service'
import { LoginLogService } from '../login-log/login-log.service'
import { JWT_MEMBER, SCOPE_MEMBER } from '../../config/app.config'
import { LOGIN_FAIL_REASON, LOGIN_METHOD, LOGIN_RESULT, MEMBER_STATUS } from '../../common/enums'
import type { LoginFailReason } from '../../common/enums'
import { toMemberProfileVo, type MemberProfileVo } from './vo/member.vo'
import type { LoginDto, RegisterDto, ResetPasswordDto } from './dto/member-auth.dto'

/** bcrypt 代价因子 */
const BCRYPT_ROUNDS = 10

/** 统一的登录失败提示，不区分账号不存在与密码错误，防止账号枚举 */
const LOGIN_FAILED_MESSAGE = '账号或密码错误'

/** 业务结果：成功返回 data，失败返回 message */
export type Result<T> =
  | { ok: true; data: T }
  /** captchaRequired 告知前端下次提交需附带图形验证码 */
  | { ok: false; message: string; captchaRequired?: boolean }

/** 登录成功返回体 */
export interface LoginResultVo {
  token: string
  profile: MemberProfileVo
  /** 下次登录是否需要图形验证码 */
  captchaRequired: boolean
}

/** 请求上下文，用于日志留痕 */
export interface RequestContext {
  ip: string | null
  userAgent: string | null
}

@Injectable()
export class MemberAuthService {
  private readonly logger = new Logger(MemberAuthService.name)

  constructor(
    @InjectRepository(Member)
    private readonly repo: Repository<Member>,
    private readonly jwtService: JwtService,
    private readonly smsCode: SmsCodeService,
    private readonly captcha: CaptchaService,
    private readonly authConfig: AuthConfigService,
    private readonly loginLog: LoginLogService,
  ) {}

  /** 按手机号查未删除的会员 */
  private findByPhone(phone: string): Promise<Member | null> {
    return this.repo.findOne({ where: { phone, deletedAt: IsNull() } })
  }

  /** 注册 */
  async register(dto: RegisterDto, ctx: RequestContext): Promise<Result<LoginResultVo>> {
    const cfg = await this.authConfig.get()
    if (!cfg.registerOpen) return { ok: false, message: '当前未开放注册' }

    const codeError = this.smsCode.verify(dto.phone, 'register', dto.smsCode)
    if (codeError) return { ok: false, message: codeError }

    const pwdError = await this.authConfig.validatePassword(dto.password)
    if (pwdError) return { ok: false, message: pwdError }

    // 手机号唯一性：仅在未删除记录中判重，软删除记录不占用
    const existing = await this.findByPhone(dto.phone)
    if (existing) return { ok: false, message: '该手机号已注册' }

    const member = this.repo.create({
      phone: dto.phone,
      nickname: dto.nickname,
      email: dto.email ?? null,
      passwordHash: await hash(dto.password, BCRYPT_ROUNDS),
      status: MEMBER_STATUS.NORMAL,
      registerIp: ctx.ip,
      lastLoginAt: new Date(),
    })
    const saved = await this.repo.save(member)

    await this.loginLog.write({
      memberId: saved.id,
      loginAccount: saved.phone,
      loginMethod: LOGIN_METHOD.PASSWORD,
      loginIp: ctx.ip,
      deviceInfo: ctx.userAgent,
      result: LOGIN_RESULT.SUCCESS,
    })

    return { ok: true, data: { token: await this.sign(saved), profile: toMemberProfileVo(saved), captchaRequired: false } }
  }

  /** 登录 */
  async login(dto: LoginDto, ctx: RequestContext): Promise<Result<LoginResultVo>> {
    const cfg = await this.authConfig.get()
    if (dto.method === LOGIN_METHOD.PASSWORD && !cfg.allowPasswordLogin) {
      return { ok: false, message: '当前未开放账号密码登录' }
    }
    if (dto.method === LOGIN_METHOD.SMS_CODE && !cfg.allowSmsLogin) {
      return { ok: false, message: '当前未开放验证码登录' }
    }

    const member = await this.findByPhone(dto.phone)

    // 账号不存在：记录真实原因供后台排查，但对外仍返回统一提示
    if (!member) {
      await this.logFailure(null, dto.phone, dto, ctx, LOGIN_FAIL_REASON.ACCOUNT_NOT_FOUND)
      return { ok: false, message: LOGIN_FAILED_MESSAGE }
    }

    if (member.status === MEMBER_STATUS.DISABLED) {
      await this.logFailure(member.id, dto.phone, dto, ctx, LOGIN_FAIL_REASON.ACCOUNT_DISABLED)
      return { ok: false, message: '账号已被禁用，请联系管理员' }
    }

    if (member.lockedUntil && member.lockedUntil.getTime() > Date.now()) {
      await this.logFailure(member.id, dto.phone, dto, ctx, LOGIN_FAIL_REASON.ACCOUNT_LOCKED)
      const minutes = Math.ceil((member.lockedUntil.getTime() - Date.now()) / 60000)
      return { ok: false, message: `账号已被临时锁定，请 ${minutes} 分钟后再试` }
    }

    // 失败次数达阈值后强制图形验证码，且必须校验答案正确性
    const captchaRequired = member.failedAttempts >= cfg.captchaThreshold
    if (captchaRequired) {
      const captchaError = this.captcha.verify(dto.captchaId, dto.captcha)
      if (captchaError) {
        await this.logFailure(member.id, dto.phone, dto, ctx, LOGIN_FAIL_REASON.WRONG_CAPTCHA)
        return { ok: false, message: captchaError }
      }
    }

    const credentialError = await this.verifyCredential(member, dto)
    if (credentialError) {
      await this.onLoginFailure(member, cfg.lockThreshold, cfg.lockMinutes)
      await this.logFailure(member.id, dto.phone, dto, ctx, credentialError)
      const message = credentialError === LOGIN_FAIL_REASON.WRONG_CAPTCHA ? '验证码错误' : LOGIN_FAILED_MESSAGE
      // 累加后若已达阈值，告知前端下次需附带图形验证码
      return { ok: false, message, captchaRequired: member.failedAttempts >= cfg.captchaThreshold }
    }

    // 登录成功：清零失败计数与锁定状态
    member.failedAttempts = 0
    member.lockedUntil = null
    member.lastLoginAt = new Date()
    const saved = await this.repo.save(member)

    await this.loginLog.write({
      memberId: saved.id,
      loginAccount: saved.phone,
      loginMethod: dto.method,
      loginIp: ctx.ip,
      deviceInfo: ctx.userAgent,
      result: LOGIN_RESULT.SUCCESS,
    })

    return { ok: true, data: { token: await this.sign(saved), profile: toMemberProfileVo(saved), captchaRequired: false } }
  }

  /** 校验登录凭证，返回失败原因或 null */
  private async verifyCredential(member: Member, dto: LoginDto): Promise<LoginFailReason | null> {
    if (dto.method === LOGIN_METHOD.SMS_CODE) {
      return this.smsCode.verify(dto.phone, 'login', dto.smsCode) ? LOGIN_FAIL_REASON.WRONG_CAPTCHA : null
    }
    if (!dto.password) return LOGIN_FAIL_REASON.WRONG_PASSWORD
    const matched = await compare(dto.password, member.passwordHash)
    return matched ? null : LOGIN_FAIL_REASON.WRONG_PASSWORD
  }

  /** 累加失败次数，达阈值则锁定 */
  private async onLoginFailure(member: Member, lockThreshold: number, lockMinutes: number): Promise<void> {
    member.failedAttempts += 1
    if (member.failedAttempts >= lockThreshold) {
      member.lockedUntil = new Date(Date.now() + lockMinutes * 60 * 1000)
      member.failedAttempts = 0
    }
    await this.repo.save(member)
  }

  /** 写入失败日志 */
  private async logFailure(
    memberId: number | null,
    account: string,
    dto: LoginDto,
    ctx: RequestContext,
    reason: LoginFailReason,
  ): Promise<void> {
    await this.loginLog.write({
      memberId,
      loginAccount: account,
      loginMethod: dto.method,
      loginIp: ctx.ip,
      deviceInfo: ctx.userAgent,
      result: LOGIN_RESULT.FAILURE,
      failReason: reason,
    })
  }

  /** 签发会员令牌，scope 固定为 member */
  private sign(member: Member): Promise<string> {
    return this.jwtService.signAsync(
      { sub: member.id, phone: member.phone, scope: SCOPE_MEMBER },
      {
        secret: JWT_MEMBER.secret,
        // 配置读出为宽泛 string，jsonwebtoken 要求时长字面量类型，此处按其签名收窄
        expiresIn: JWT_MEMBER.expiresIn as `${number}${'s' | 'm' | 'h' | 'd'}`,
      },
    )
  }

  /** 发送验证码 */
  async sendSmsCode(phone: string, purpose: 'register' | 'login' | 'reset'): Promise<Result<null>> {
    // 注册用途需确认手机号未被占用，其余用途不透露账号是否存在
    if (purpose === 'register') {
      const existing = await this.findByPhone(phone)
      if (existing) return { ok: false, message: '该手机号已注册' }
    }
    const error = this.smsCode.send(phone, purpose)
    if (error) return { ok: false, message: error }
    return { ok: true, data: null }
  }

  /** 重置密码 */
  async resetPassword(dto: ResetPasswordDto): Promise<Result<null>> {
    const codeError = this.smsCode.verify(dto.phone, 'reset', dto.smsCode)
    if (codeError) return { ok: false, message: codeError }

    const pwdError = await this.authConfig.validatePassword(dto.newPassword)
    if (pwdError) return { ok: false, message: pwdError }

    const member = await this.findByPhone(dto.phone)
    // 账号不存在时返回成功，避免通过重置流程枚举账号
    if (!member) {
      this.logger.warn(`重置密码：手机号未注册 ${dto.phone}`)
      return { ok: true, data: null }
    }

    member.passwordHash = await hash(dto.newPassword, BCRYPT_ROUNDS)
    member.failedAttempts = 0
    member.lockedUntil = null
    await this.repo.save(member)
    return { ok: true, data: null }
  }
}
