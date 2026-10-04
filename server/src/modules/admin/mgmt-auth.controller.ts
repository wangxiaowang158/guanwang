// 后台管理员认证接口 —— /api/mgmt/auth/*
// 登录为免登录接口，限流比全局更严（暴力破解主要入口）；
// profile 与改密需已登录，挂 AdminGuard。
import { Body, Controller, Get, Post, Put, Req, UseGuards } from '@nestjs/common'
import { Throttle, ThrottlerGuard } from '@nestjs/throttler'
import type { Request } from 'express'
import { extractContext } from '../../common/request-context'
import { AdminAuthService } from './admin-auth.service'
import { AdminService } from './admin.service'
import { AdminGuard, type CurrentAdminInfo, type RequestWithAdmin } from '../../common/guards/admin.guard'
import { CurrentAdmin } from '../../common/decorators/current-admin.decorator'
import { raw } from '../../common/interceptors/transform.interceptor'
import { TokenRevocationService } from '../kv/token-revocation.service'
import { AdminLoginDto, ChangeOwnPasswordDto } from './dto/admin.dto'

@Controller('mgmt/auth')
export class MgmtAuthController {
  constructor(
    private readonly authService: AdminAuthService,
    private readonly adminService: AdminService,
    private readonly revocation: TokenRevocationService,
  ) {}

  /**
   * 管理员登录
   * 失败统一返回 code:401 与脱敏文案，不区分账号不存在与密码错误
   */
  @Post('login')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async login(@Body() dto: AdminLoginDto, @Req() req: Request) {
    const result = await this.authService.login(dto.username, dto.password, extractContext(req).ip)
    if (result === 'invalid') return raw(null, '账号或密码错误，请重新输入', 401)
    if ('lockedMinutes' in result) {
      // 文案取 SRS 3.5.4 原文；前端登录页按失败次数另有冷却倒计时
      return raw(null, '操作过于频繁，请稍后再试', 423)
    }
    return raw(result, '登录成功')
  }

  /**
   * 退出登录：吊销当前令牌，此后即便令牌被截获也不可再用
   * 挂 AdminGuard 以取到已校验的令牌；令牌本已失效时守卫返回 401，
   * 前端退出流程不论结果都会清除本地凭证，故无影响
   */
  @Post('logout')
  @UseGuards(AdminGuard)
  async logout(@Req() req: RequestWithAdmin) {
    if (req.token) await this.revocation.revoke(req.token.raw, req.token.exp)
    return raw(null, '退出成功')
  }

  /** 读取当前登录管理员身份与权限，前端据此渲染菜单 */
  @Get('profile')
  @UseGuards(AdminGuard)
  profile(@CurrentAdmin() admin: CurrentAdminInfo) {
    return {
      id: admin.id,
      account: admin.account,
      name: admin.name,
      perms: admin.perms,
      isSuper: admin.isSuper,
    }
  }

  /** 修改自己的密码 */
  @Put('password')
  @UseGuards(AdminGuard)
  async changePassword(
    @CurrentAdmin() admin: CurrentAdminInfo,
    @Body() dto: ChangeOwnPasswordDto,
  ) {
    const error = await this.adminService.changeOwnPassword(admin.id, dto.oldPassword, dto.newPassword)
    return error ? raw(null, error, 400) : raw(null, '密码修改成功')
  }
}
