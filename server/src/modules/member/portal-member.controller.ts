// 前台会员资料接口 —— /api/portal/member/*
// 全部需登录；会员 id 一律取自令牌，不接受前端传入
import { Body, Controller, Get, Post, Put, Req, UseGuards } from '@nestjs/common'
import { MemberService } from './member.service'
import { MemberGuard, type MemberTokenPayload, type RequestWithMember } from '../../common/guards/member.guard'
import { TokenRevocationService } from '../kv/token-revocation.service'
import { CurrentMember } from '../../common/decorators/current-member.decorator'
import { raw } from '../../common/interceptors/transform.interceptor'
import { ChangePasswordDto, UpdateProfileDto } from './dto/member-manage.dto'
import { AuthConfigService } from '../auth-config/auth-config.service'

@Controller('portal/member')
@UseGuards(MemberGuard)
export class PortalMemberController {
  constructor(
    private readonly memberService: MemberService,
    private readonly authConfig: AuthConfigService,
    private readonly revocation: TokenRevocationService,
  ) {}

  /** 退出登录：吊销当前令牌，此后即便令牌被截获也不可再用 */
  @Post('logout')
  async logout(@Req() req: RequestWithMember) {
    if (req.token) await this.revocation.revoke(req.token.raw, req.token.exp)
    return raw(null, '退出成功')
  }

  /** 读取当前会员资料 */
  @Get('profile')
  async profile(@CurrentMember() member: MemberTokenPayload) {
    const result = await this.memberService.getProfile(member.sub)
    return result.ok ? result.data : raw(null, result.message, 404)
  }

  /** 修改当前会员资料 */
  @Put('profile')
  async updateProfile(@CurrentMember() member: MemberTokenPayload, @Body() dto: UpdateProfileDto) {
    const result = await this.memberService.updateProfile(member.sub, dto)
    return result.ok ? raw(result.data, '保存成功') : raw(null, result.message, 400)
  }

  /** 修改当前会员密码 */
  @Put('password')
  async changePassword(@CurrentMember() member: MemberTokenPayload, @Body() dto: ChangePasswordDto) {
    // 新密码需满足后台配置的强度要求
    const pwdError = await this.authConfig.validatePassword(dto.newPassword)
    if (pwdError) return raw(null, pwdError, 400)

    const result = await this.memberService.changePassword(member.sub, dto)
    return result.ok ? raw(null, '密码已修改') : raw(null, result.message, 400)
  }
}
