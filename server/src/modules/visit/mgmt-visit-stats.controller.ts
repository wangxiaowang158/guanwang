// 后台访问统计接口 —— /api/mgmt/visit-stats/*
import { Controller, Delete, Get, Query, UseGuards } from '@nestjs/common'
import { AdminGuard } from '../../common/guards/admin.guard'
import { PermGuard } from '../../common/guards/perm.guard'
import { PERM, RequirePerm } from '../../common/decorators/require-perm.decorator'
import { raw } from '../../common/interceptors/transform.interceptor'
import { ClearVisitLogDto, VisitStatsQueryDto } from './dto/visit.dto'
import { rangeOfLastDays, VisitService } from './visit.service'

/** 未指定范围时的默认统计天数，与 SRS「进入页面默认近 7 日」一致 */
const DEFAULT_RANGE_DAYS = 7

@Controller('mgmt/visit-stats')
@UseGuards(AdminGuard, PermGuard)
@RequirePerm(PERM.VISIT_STATS)
export class MgmtVisitStatsController {
  constructor(private readonly service: VisitService) {}

  /**
   * 访问统计聚合：关键指标 + 按日趋势 + 板块关注度
   * 自定义日期须两端齐全才生效，只给一端时按快捷范围处理（与 SRS 的「不发起查询」对应，
   * 前台在未选全时本就不会发请求，此处再兜一层）
   */
  @Get('summary')
  async summary(@Query() query: VisitStatsQueryDto) {
    const range =
      query.startDate && query.endDate
        ? { startDate: query.startDate, endDate: query.endDate }
        : rangeOfLastDays(query.range || DEFAULT_RANGE_DAYS)
    return this.service.summary(range.startDate, range.endDate)
  }

  /**
   * 清理指定日期之前的访问日志
   * 访问日志只增不减，长期运行后会拖慢统计聚合，由管理员按需清理。
   * 与登录日志的清理一致：不可撤销，前端须二次确认
   */
  @Delete('clear')
  async clear(@Query() query: ClearVisitLogDto) {
    const count = await this.service.clearBefore(query.before)
    return raw({ count }, `已清理 ${count} 条访问日志`)
  }
}
