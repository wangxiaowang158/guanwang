// 前台反馈接口 —— /api/portal/feedback/*
// 匿名提交免登录但限流更严（防灌水）；会员接口的身份一律取自令牌
import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common'
import { Throttle, ThrottlerGuard } from '@nestjs/throttler'
import type { Request } from 'express'
import { FeedbackService } from './feedback.service'
import { MemberGuard } from '../../common/guards/member.guard'
import type { MemberTokenPayload } from '../../common/guards/member.guard'
import { CurrentMember } from '../../common/decorators/current-member.decorator'
import { extractContext } from '../../common/request-context'
import { raw } from '../../common/interceptors/transform.interceptor'
import { SubmitAnonymousFeedbackDto, SubmitMemberFeedbackDto } from './dto/feedback.dto'

@Controller('portal/feedback')
@UseGuards(ThrottlerGuard)
export class PortalFeedbackController {
  constructor(private readonly service: FeedbackService) {}

  /** 匿名咨询提交（原留言入口，无需登录） */
  @Post('anonymous')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async submitAnonymous(@Body() dto: SubmitAnonymousFeedbackDto, @Req() req: Request) {
    const result = await this.service.submitAnonymous(dto, extractContext(req))
    return result.ok ? raw(result.data, '提交成功，我们会尽快与您联系') : raw(null, result.message, 400)
  }

  /** 会员提交反馈 */
  @Post('submit')
  @UseGuards(MemberGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async submit(
    @CurrentMember() member: MemberTokenPayload,
    @Body() dto: SubmitMemberFeedbackDto,
    @Req() req: Request,
  ) {
    // 会员 id 取自令牌载荷的 sub，绝不采信请求体传入的身份
    const result = await this.service.submitByMember(member.sub, dto, extractContext(req))
    return result.ok ? raw(result.data, '提交成功') : raw(null, result.message, 400)
  }

  /** 会员查看自己的反馈及回复 */
  @Get('mine')
  @UseGuards(MemberGuard)
  async mine(@CurrentMember() member: MemberTokenPayload) {
    const result = await this.service.listByMember(member.sub)
    return result.ok ? result.data : raw(null, result.message, 400)
  }
}
