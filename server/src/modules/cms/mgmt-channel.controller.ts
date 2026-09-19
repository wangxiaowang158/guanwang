// 后台栏目管理接口 —— /api/mgmt/channel/*
// 读接口（list/detail）只要求管理员登录：侧边栏菜单由栏目树驱动，
// 任何管理员都得先拿到栏目结构才能渲染自己有权的菜单项，不能卡在「栏目管理」权限上。
// 写接口（add/update/delete）才要求被授予「栏目管理」权限。
import {
  Body, Controller, Delete, Get, ParseIntPipe, Post, Put, Query, UseGuards,
} from '@nestjs/common'
import { PERM, RequirePerm } from '../../common/decorators/require-perm.decorator'
import { AdminGuard } from '../../common/guards/admin.guard'
import { PermGuard } from '../../common/guards/perm.guard'
import { raw } from '../../common/interceptors/transform.interceptor'
import { ChannelService } from './channel.service'
import { ChannelQueryDto, CreateChannelDto, UpdateChannelDto } from './dto/channel.dto'
import { toChannelVo } from './vo/cms.vo'

@Controller('mgmt/channel')
@UseGuards(AdminGuard, PermGuard)
export class MgmtChannelController {
  constructor(private readonly service: ChannelService) {}

  /** 全部栏目，扁平数组；仅需登录，供侧边栏渲染 */
  @Get('list')
  async list() {
    const rows = await this.service.list()
    return rows.map(toChannelVo)
  }

  /** 按 key 或 id 取单个栏目；仅需登录，内容页据此决定渲染形态 */
  @Get('detail')
  async detail(@Query() query: ChannelQueryDto) {
    const found = await this.service.detail(query)
    return toChannelVo(found)
  }

  /** 新增栏目 */
  @Post('add')
  @RequirePerm(PERM.CHANNEL_MANAGE)
  async add(@Body() dto: CreateChannelDto) {
    const created = await this.service.create(dto)
    return raw(toChannelVo(created), '新增成功')
  }

  /** 更新栏目 */
  @Put('update')
  @RequirePerm(PERM.CHANNEL_MANAGE)
  async update(@Body() dto: UpdateChannelDto) {
    await this.service.update(dto)
    return raw(null, '保存成功')
  }

  /** 删除栏目，级联删除子栏目与其内容 */
  @Delete('delete')
  @RequirePerm(PERM.CHANNEL_MANAGE)
  async remove(@Query('id', ParseIntPipe) id: number) {
    await this.service.remove(id)
    return raw(null, '删除成功')
  }
}
