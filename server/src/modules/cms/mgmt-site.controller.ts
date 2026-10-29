// 后台站点信息接口 —— /api/mgmt/site/*
// 基本信息属系统级模块，不参与权限分配：
//   读取：登录即可。后台顶栏「进入网站」要取网址，所有管理员都会调；内容不含密钥
//   保存：仅超级管理员。改的是全站公司信息、首页布局、统计代码与水印，影响面是整个官网，
//         统计代码还会原样注入前台页面，不能交给按栏目授权的普通管理员
import { Body, Controller, ForbiddenException, Get, Post, UseGuards } from '@nestjs/common'
import { AdminGuard, type CurrentAdminInfo } from '../../common/guards/admin.guard'
import { CurrentAdmin } from '../../common/decorators/current-admin.decorator'
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
    return this.service.getForAdmin()
  }

  /** 保存站点基本信息（仅超管） */
  @Post('save')
  async save(@Body() dto: SaveSiteConfigDto, @CurrentAdmin() admin: CurrentAdminInfo) {
    if (!admin.isSuper) throw new ForbiddenException('仅超级管理员可修改基本信息')
    await this.service.save(dto)
    return raw(null, '保存成功')
  }
}
