// 前台反馈接口 —— /api/portal/feedback/*
// 匿名提交免登录但限流更严（防灌水）；会员接口的身份一律取自令牌
import { Body, Controller, Get, Logger, Post, Req, UseGuards } from '@nestjs/common'
import { Throttle, ThrottlerGuard } from '@nestjs/throttler'
import type { Request } from 'express'
import { FeedbackService } from './feedback.service'
import { MemberGuard } from '../../common/guards/member.guard'
import type { MemberTokenPayload } from '../../common/guards/member.guard'
import { CurrentMember } from '../../common/decorators/current-member.decorator'
import { extractContext } from '../../common/request-context'
import { raw } from '../../common/interceptors/transform.interceptor'
import { SubmitAnonymousFeedbackDto, SubmitMemberFeedbackDto } from './dto/feedback.dto'
import { checkFormSubmission, issueFormToken } from './form-guard'

/** 匿名提交成功提示；被防刷静默丢弃时也回这句，不让脚本分辨 */
const SUBMIT_OK_MESSAGE = '提交成功，我们会尽快与您联系'

@Controller('portal/feedback')
@UseGuards(ThrottlerGuard)
export class PortalFeedbackController {
  private readonly logger = new Logger(PortalFeedbackController.name)

  constructor(private readonly service: FeedbackService) {}

  /** 匿名表单令牌：打开留言/预约表单时领取，提交时带回，用于防刷（见 form-guard） */
  @Get('form-token')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  formToken() {
    return { token: issueFormToken() }
  }

  /** 匿名咨询提交（原留言入口，无需登录） */
  @Post('anonymous')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async submitAnonymous(@Body() dto: SubmitAnonymousFeedbackDto, @Req() req: Request) {
    const ctx = extractContext(req)
    const verdict = checkFormSubmission({ honeypot: dto.website, formToken: dto.formToken, content: dto.content })
    if (!verdict.pass) {
      this.logger.warn(`匿名留言被防刷拦截：${verdict.reason}，IP ${ctx.ip}`)
      // 机器特征明确的按成功回复、不入库；可能是真人的明确提示怎么改
      return verdict.silent ? raw({ id: 0 }, SUBMIT_OK_MESSAGE) : raw(null, verdict.message, 400)
    }
    const result = await this.service.submitAnonymous(dto, ctx)
    return result.ok ? raw(result.data, SUBMIT_OK_MESSAGE) : raw(null, result.message, 400)
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
