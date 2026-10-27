// 跳转规则模块
import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AdminModule } from '../admin/admin.module'
import { MgmtRedirectController, PortalRedirectController } from './redirect.controller'
import { RedirectRule } from './redirect.entity'
import { RedirectService } from './redirect.service'

@Module({
  imports: [TypeOrmModule.forFeature([RedirectRule]), AdminModule],
  controllers: [MgmtRedirectController, PortalRedirectController],
  providers: [RedirectService],
})
export class RedirectModule {}
