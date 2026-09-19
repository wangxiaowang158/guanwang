// 前台访问上报接口 —— /api/portal/visit/*
// 免登录埋点，按 IP 限流防刷量；非法 key 静默丢弃，不向访客暴露栏目校验结果
import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common'
import { Throttle, ThrottlerGuard } from '@nestjs/throttler'
import type { Request } from 'express'
import { extractContext } from '../../common/request-context'
import { RecordVisitDto } from './dto/visit.dto'
import { VisitService } from './visit.service'

@Controller('portal/visit')
@UseGuards(ThrottlerGuard)
export class PortalVisitController {
  constructor(private readonly service: VisitService) {}

  /**
   * 记录一次板块访问
   * 限流按分钟 30 次：正常浏览远低于此值，刷量会被拦下；
   * 无论是否落库都回成功，埋点失败不该影响前台渲染
   */
  @Post('record')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async record(@Body() dto: RecordVisitDto, @Req() req: Request) {
    await this.service.record(dto.channelKey, extractContext(req).ip)
    return null
  }
}
