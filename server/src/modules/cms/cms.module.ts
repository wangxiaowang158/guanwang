// CMS 模块 —— 栏目 / 内容 / 站点信息，同时对外提供前台只读接口
// 管理端与前台共用同一套数据，避免两边各存一份而失同步
import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AdminModule } from '../admin/admin.module'
import { Channel } from './channel.entity'
import { ChannelService } from './channel.service'
import { Content } from './content.entity'
import { ContentService } from './content.service'
import { ChannelPermGuard } from './guards/channel-perm.guard'
import { HomeSectionService } from './home-section.service'
import { MgmtChannelController } from './mgmt-channel.controller'
import { MgmtContentController } from './mgmt-content.controller'
import { MgmtSiteController } from './mgmt-site.controller'
import { PortalCmsController } from './portal-cms.controller'
import { PortalCmsService } from './portal-cms.service'
import { SiteConfig } from './site-config.entity'
import { SiteConfigService } from './site-config.service'

@Module({
  // AdminModule 提供后台接口所需的 AdminGuard / PermGuard
  imports: [TypeOrmModule.forFeature([Channel, Content, SiteConfig]), AdminModule],
  controllers: [
    MgmtChannelController,
    MgmtContentController,
    MgmtSiteController,
    PortalCmsController,
  ],
  providers: [
    ChannelService,
    ContentService,
    SiteConfigService,
    PortalCmsService,
    HomeSectionService,
    // 内容接口的栏目级权限校验，依赖 ChannelService
    ChannelPermGuard,
  ],
  exports: [ChannelService, ContentService, SiteConfigService],
})
export class CmsModule {}
