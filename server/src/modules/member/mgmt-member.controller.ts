// 后台会员管理接口 —— /api/mgmt/member/*
// ⚠️ 当前挂 MgmtDevGuard（开发期占位守卫，无真实鉴权能力），详见该守卫文件头部说明
import { Body, Controller, Delete, Get, Param, ParseIntPipe, Put, Query, UseGuards } from '@nestjs/common'
import { MemberService } from './member.service'
import { LoginLogService } from '../login-log/login-log.service'
import { MgmtDevGuard } from '../../common/guards/mgmt-dev.guard'
import { raw } from '../../common/interceptors/transform.interceptor'
import { AdminResetPasswordDto, MemberQueryDto, UpdateMemberStatusDto } from './dto/member-manage.dto'

@Controller('mgmt/member')
@UseGuards(MgmtDevGuard)
export class MgmtMemberController {
  constructor(
    private readonly memberService: MemberService,
    private readonly loginLog: LoginLogService,
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

  /** 重置会员密码 */
  @Put('reset-password/:id')
  async resetPassword(@Param('id', ParseIntPipe) id: number, @Body() dto: AdminResetPasswordDto) {
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
