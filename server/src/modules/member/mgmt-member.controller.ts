// 后台会员管理接口 —— /api/mgmt/member/*
// 需管理员登录（scope=admin）且被授予「会员中心」权限
import { Body, Controller, Delete, Get, Param, ParseIntPipe, Put, Query, UseGuards } from '@nestjs/common'
import { MemberService } from './member.service'
import { LoginLogService } from '../login-log/login-log.service'
import { AuthConfigService } from '../auth-config/auth-config.service'
import { AdminGuard } from '../../common/guards/admin.guard'
import { PermGuard } from '../../common/guards/perm.guard'
import { PERM, RequirePerm } from '../../common/decorators/require-perm.decorator'
import { raw } from '../../common/interceptors/transform.interceptor'
import { AdminResetPasswordDto, MemberQueryDto, UpdateMemberStatusDto } from './dto/member-manage.dto'

@Controller('mgmt/member')
@UseGuards(AdminGuard, PermGuard)
@RequirePerm(PERM.MEMBER_CENTER)
export class MgmtMemberController {
  constructor(
    private readonly memberService: MemberService,
    private readonly loginLog: LoginLogService,
    private readonly authConfig: AuthConfigService,
  ) {}

  /** 会员列表（分页 + 筛选） */
  @Get('list')
  list(@Query() query: MemberQueryDto) {
    return this.memberService.list(query)
  }

  /** 会员详情，附最近登录记录 */
  @Get('detail/:id')
  async detail(@Param('id', ParseIntPipe) id: number) {
    const result = await this.memberService.detail(id)
    if (!result.ok) return raw(null, result.message, 404)

    const recentLogins = await this.loginLog.recentByMember(id)
    return { ...result.data, recentLogins }
  }

  /** 变更会员状态（启用/禁用） */
  @Put('status/:id')
  async updateStatus(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateMemberStatusDto) {
    const result = await this.memberService.updateStatus(id, dto.status)
    return result.ok ? raw(null, '状态已更新') : raw(null, result.message, 404)
  }

  /** 解除风控锁定，不改变启用/禁用状态 */
  @Put('unlock/:id')
  async unlock(@Param('id', ParseIntPipe) id: number) {
    const result = await this.memberService.unlock(id)
    return result.ok ? raw(null, '已解除锁定') : raw(null, result.message, 404)
  }

  /** 重置会员密码 */
  @Put('reset-password/:id')
  async resetPassword(@Param('id', ParseIntPipe) id: number, @Body() dto: AdminResetPasswordDto) {
    // 与注册、找回、自助改密同一口径：后台重置出的弱口令同样会被撞库
    const pwdError = await this.authConfig.validatePassword(dto.newPassword)
    if (pwdError) return raw(null, pwdError, 400)

    const result = await this.memberService.resetPassword(id, dto.newPassword)
    return result.ok ? raw(null, '密码已重置') : raw(null, result.message, 404)
  }

  /** 删除会员（软删除） */
  @Delete('delete/:id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    const result = await this.memberService.remove(id)
    return result.ok ? raw(null, '删除成功') : raw(null, result.message, 404)
  }
}
