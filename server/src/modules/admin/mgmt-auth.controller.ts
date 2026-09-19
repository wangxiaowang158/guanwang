// 后台管理员认证接口 —— /api/mgmt/auth/*
// 登录为免登录接口，限流比全局更严（暴力破解主要入口）；
// profile 与改密需已登录，挂 AdminGuard。
import { Body, Controller, Get, Post, Put, UseGuards } from '@nestjs/common'
import { Throttle, ThrottlerGuard } from '@nestjs/throttler'
import { AdminAuthService } from './admin-auth.service'
import { AdminService } from './admin.service'
import { AdminGuard, type CurrentAdminInfo } from '../../common/guards/admin.guard'
import { CurrentAdmin } from '../../common/decorators/current-admin.decorator'
import { raw } from '../../common/interceptors/transform.interceptor'
import { AdminLoginDto, ChangeOwnPasswordDto } from './dto/admin.dto'

@Controller('mgmt/auth')
export class MgmtAuthController {
  constructor(
    private readonly authService: AdminAuthService,
    private readonly adminService: AdminService,
  ) {}

  /**
   * 管理员登录
   * 失败统一返回 code:401 与脱敏文案，不区分账号不存在与密码错误
   */
  @Post('login')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async login(@Body() dto: AdminLoginDto) {
    const result = await this.authService.login(dto.username, dto.password)
    if (!result) return raw(null, '账号或密码错误，请重新输入', 401)
    return raw(result, '登录成功')
  }

  /**
   * 退出登录
   * 令牌为无状态 JWT，服务端不维护会话，实际由前端清除本地凭证；
   * 保留此接口是为与前端调用保持一致，并预留将来加入黑名单的位置。
   */
  @Post('logout')
  logout() {
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
