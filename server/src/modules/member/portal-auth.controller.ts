// 前台会员认证接口 —— /api/portal/auth/*
// 全部为免登录接口，限流比全局更严：注册登录与发码是暴力破解与短信轰炸的主要入口
import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common'
import { Throttle, ThrottlerGuard } from '@nestjs/throttler'
import type { Request } from 'express'
import { MemberAuthService } from './member-auth.service'
import { CaptchaService } from './captcha.service'
import { AuthConfigService } from '../auth-config/auth-config.service'
import { extractContext } from '../../common/request-context'
import { raw } from '../../common/interceptors/transform.interceptor'
import { LoginDto, RegisterDto, ResetPasswordDto, SendSmsDto } from './dto/member-auth.dto'

@Controller('portal/auth')
@UseGuards(ThrottlerGuard)
export class PortalAuthController {
  constructor(
    private readonly authService: MemberAuthService,
    private readonly captcha: CaptchaService,
    private readonly authConfig: AuthConfigService,
  ) {}

  /** 读取前台登录注册页所需的配置（不含内部阈值细节） */
  @Get('config')
  async config() {
    const cfg = await this.authConfig.get()
    return {
      registerOpen: cfg.registerOpen,
      allowPasswordLogin: cfg.allowPasswordLogin,
      allowSmsLogin: cfg.allowSmsLogin,
      passwordMinLength: cfg.passwordMinLength,
      passwordRequireMixed: cfg.passwordRequireMixed,
    }
  }

  /** 获取图形验证码 */
  @Get('captcha')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  captchaChallenge() {
    return this.captcha.issue()
  }

  /** 发送短信验证码：按 IP 限流，服务内另有按手机号的频次限制 */
  @Post('sms-code')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async sendSmsCode(@Body() dto: SendSmsDto) {
    const result = await this.authService.sendSmsCode(dto.phone, dto.purpose)
    return result.ok ? raw(null, '验证码已发送') : raw(null, result.message, 400)
  }

  /** 注册 */
  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async register(@Body() dto: RegisterDto, @Req() req: Request) {
    const result = await this.authService.register(dto, extractContext(req))
    return result.ok ? raw(result.data, '注册成功') : raw(null, result.message, 400)
  }

  /** 登录 */
  @Post('login')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    const result = await this.authService.login(dto, extractContext(req))
    if (result.ok) return raw(result.data, '登录成功')
    // 401 表凭证问题，前端据此展示错误并按 captchaRequired 决定是否显示验证码
    return raw({ captchaRequired: result.captchaRequired ?? false }, result.message, 401)
  }

  /** 重置密码 */
  @Post('reset-password')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    const result = await this.authService.resetPassword(dto)
    return result.ok ? raw(null, '密码已重置') : raw(null, result.message, 400)
  }
}
