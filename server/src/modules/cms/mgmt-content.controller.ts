// 后台内容管理接口 —— /api/mgmt/content/*
// 需管理员登录（scope=admin），并按「该内容所属顶级栏目」校验权限：
// SRS 3.4 规定内容管理可按栏目分别授予，故用 ChannelPermGuard 做动态校验，
// 不能整体挂「栏目管理」——那是维护栏目结构本身的权限，两者不是一回事。
import { Body, Controller, Delete, Get, Post, Put, Query, UseGuards } from '@nestjs/common'
import { AdminGuard } from '../../common/guards/admin.guard'
import { raw } from '../../common/interceptors/transform.interceptor'
import { ChannelPermGuard } from './guards/channel-perm.guard'
import { ContentService } from './content.service'
import {
  ContentDetailQueryDto, ContentListQueryDto, SaveContentDto, ToggleTopDto, UpdateSortDto,
} from './dto/content.dto'
import { toContentVo } from './vo/cms.vo'

@Controller('mgmt/content')
@UseGuards(AdminGuard, ChannelPermGuard)
export class MgmtContentController {
  constructor(private readonly service: ContentService) {}

  /** 某栏目的内容列表 */
  @Get('list')
  async list(@Query() query: ContentListQueryDto) {
    const rows = await this.service.list(query)
    return rows.map(toContentVo)
  }

  /** 单条内容详情；不传 id 时返回该栏目首条（单页型栏目用） */
  @Get('detail')
  async detail(@Query() query: ContentDetailQueryDto) {
    const found = await this.service.detail(query)
    return found ? toContentVo(found) : null
  }

  /** 保存内容：带 id 为更新，不带为新增 */
  @Post('save')
  async save(@Body() dto: SaveContentDto) {
    const saved = await this.service.save(dto)
    return raw(toContentVo(saved), '保存成功')
  }

  /** 删除内容，ids 为逗号分隔的 id 串 */
  @Delete('delete')
  async remove(@Query('channelKey') channelKey: string, @Query('ids') ids: string) {
    // 外部输入需校验：过滤非法值，避免把 NaN 传入查询
    const parsed = String(ids || '')
      .split(',')
      .map(s => Number(s.trim()))
      .filter(n => Number.isInteger(n) && n > 0)
    await this.service.remove(String(channelKey || ''), parsed)
    return raw(null, '删除成功')
  }

  /** 切换置顶 */
  @Put('top')
  async toggleTop(@Body() dto: ToggleTopDto) {
    const isTop = await this.service.toggleTop(dto.channelKey, dto.id)
    return raw(null, isTop ? '已置顶' : '已取消置顶')
  }

  /** 修改排序值 */
  @Put('sort')
  async updateSort(@Body() dto: UpdateSortDto) {
    await this.service.updateSort(dto.channelKey, dto.id, dto.sort)
    return raw(null, '排序已更新')
  }
}
