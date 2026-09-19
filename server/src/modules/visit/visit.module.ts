// 访问统计模块 —— 前台埋点采集 + 后台访问统计与数据仪表盘
// 仪表盘指标横跨反馈与内容两模块，故此处直接注入其实体仓储做只读统计
import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AdminModule } from '../admin/admin.module'
import { Channel } from '../cms/channel.entity'
import { Content } from '../cms/content.entity'
import { Feedback } from '../feedback/feedback.entity'
import { DashboardService } from './dashboard.service'
import { MgmtDashboardController } from './mgmt-dashboard.controller'
import { MgmtVisitStatsController } from './mgmt-visit-stats.controller'
import { PortalVisitController } from './portal-visit.controller'
import { VisitLog } from './visit-log.entity'
import { VisitService } from './visit.service'

@Module({
  imports: [TypeOrmModule.forFeature([VisitLog, Channel, Content, Feedback]), AdminModule],
  controllers: [PortalVisitController, MgmtVisitStatsController, MgmtDashboardController],
  providers: [VisitService, DashboardService],
})
export class VisitModule {}
