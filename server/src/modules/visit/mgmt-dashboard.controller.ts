// 后台数据仪表盘接口 —— /api/mgmt/dashboard/*
import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { AdminGuard } from '../../common/guards/admin.guard'
import { PermGuard } from '../../common/guards/perm.guard'
import { PERM, RequirePerm } from '../../common/decorators/require-perm.decorator'
import { DashboardService } from './dashboard.service'
import { TrendQueryDto } from './dto/visit.dto'

/** 趋势默认天数，与前端默认选中的「近 7 日」一致 */
const DEFAULT_TREND_DAYS = 7

@Controller('mgmt/dashboard')
@UseGuards(AdminGuard, PermGuard)
@RequirePerm(PERM.DASHBOARD)
export class MgmtDashboardController {
  constructor(private readonly service: DashboardService) {}

  /** 指标卡：累计/今日访问量、反馈总数、待处理反馈数、新闻案例数 */
  @Get('metrics')
  async metrics() {
    return this.service.metrics()
  }

  /** 访问趋势，range 为 7 或 30 */
  @Get('trend')
  async trend(@Query() query: TrendQueryDto) {
    return this.service.trend(query.range || DEFAULT_TREND_DAYS)
  }

  /** 最新反馈概览（5 条） */
  @Get('recent-feedback')
  async recentFeedback() {
    return this.service.recentFeedback()
  }
}
