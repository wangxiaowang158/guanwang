// 后台站点信息接口 —— /api/mgmt/site/*
// 基本信息属系统级模块，不参与权限分配，仅要求管理员登录
import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common'
import { AdminGuard } from '../../common/guards/admin.guard'
import { raw } from '../../common/interceptors/transform.interceptor'
import { SaveSiteConfigDto } from './dto/site-config.dto'
import { SiteConfigService } from './site-config.service'

@Controller('mgmt/site')
@UseGuards(AdminGuard)
export class MgmtSiteController {
  constructor(private readonly service: SiteConfigService) {}

  /** 读取站点基本信息 */
  @Get('detail')
  async detail() {
    const config = await this.service.get()
    const { id: _id, updatedAt: _updatedAt, ...rest } = config
    return rest
  }

  /** 保存站点基本信息 */
  @Post('save')
  async save(@Body() dto: SaveSiteConfigDto) {
    await this.service.save(dto)
    return raw(null, '保存成功')
  }
}
