// 前台内容接口 —— /api/portal/*
// 全部只读、无需登录；不暴露任何后台字段（如 formFields / listColumns）
import { Controller, Get, Query } from '@nestjs/common'
import { HomeSectionService } from './home-section.service'
import { PortalCmsService } from './portal-cms.service'
import { SiteConfigService } from './site-config.service'

@Controller('portal')
export class PortalCmsController {
  constructor(
    private readonly portalCms: PortalCmsService,
    private readonly homeSection: HomeSectionService,
    private readonly siteConfig: SiteConfigService,
  ) {}

  /** 站点基本信息 */
  @Get('site/detail')
  async siteDetail() {
    const config = await this.siteConfig.get()
    const { id: _id, updatedAt: _updatedAt, ...rest } = config
    return rest
  }

  /** 导航菜单树 */
  @Get('menu')
  menu() {
    return this.portalCms.menu()
  }

  /** 各栏目 SEO 配置，一次取全量 */
  @Get('seo')
  seo() {
    return this.portalCms.seoConfigs()
  }

  /** 首页各板块聚合数据 */
  @Get('home/sections')
  homeSections() {
    return this.homeSection.sections()
  }

  /**
   * 栏目页内容
   * @param key 一级栏目标识，非法值由服务层按「栏目不存在」处理
   */
  @Get('page')
  page(@Query('key') key: string) {
    return this.portalCms.pageContent(String(key || ''))
  }
}
