// 后台反馈管理接口 —— /api/mgmt/feedback/*
// ⚠️ 当前挂 MgmtDevGuard（开发期占位守卫，无真实鉴权能力），详见该守卫文件头部说明
import {
  Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, UseGuards,
} from '@nestjs/common'
import { FeedbackService } from './feedback.service'
import { MgmtDevGuard } from '../../common/guards/mgmt-dev.guard'
import { raw } from '../../common/interceptors/transform.interceptor'
import { FeedbackQueryDto, ReplyFeedbackDto, UpdateFeedbackStatusDto } from './dto/feedback.dto'

@Controller('mgmt/feedback')
@UseGuards(MgmtDevGuard)
export class MgmtFeedbackController {
  constructor(private readonly service: FeedbackService) {}

  /** 反馈列表（分页 + 来源/状态/类型/关键词/日期筛选） */
  @Get('list')
  list(@Query() query: FeedbackQueryDto) {
    return this.service.list(query)
  }

  /** 反馈详情，含全部回复 */
  @Get('detail/:id')
  async detail(@Param('id', ParseIntPipe) id: number) {
    const result = await this.service.detail(id)
    return result.ok ? result.data : raw(null, result.message, 404)
  }

  /** 回复反馈 */
  @Post('reply/:id')
  async reply(@Param('id', ParseIntPipe) id: number, @Body() dto: ReplyFeedbackDto) {
    const result = await this.service.reply(id, dto)
    return result.ok ? raw(result.data, '回复成功') : raw(null, result.message, 400)
  }

  /** 变更处理状态 */
  @Put('status/:id')
  async updateStatus(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateFeedbackStatusDto) {
    const result = await this.service.updateStatus(id, dto)
    return result.ok ? raw(null, '状态已更新') : raw(null, result.message, 400)
  }

  /** 删除单条反馈 */
  @Delete('delete/:id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    const result = await this.service.remove([id])
    return result.ok ? raw(null, '删除成功') : raw(null, result.message, 404)
  }

  /** 批量删除，ids 为逗号分隔的数字串 */
  @Delete('batch')
  async batchRemove(@Query('ids') ids: string) {
    // 外部输入需校验：过滤非法值，避免把 NaN 传入查询
    const parsed = String(ids || '')
      .split(',')
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isInteger(n) && n > 0)

    if (parsed.length === 0) return raw(null, 'ids 参数不合法', 400)

    const result = await this.service.remove(parsed)
    return result.ok ? raw(result.data, '删除成功') : raw(null, result.message, 404)
  }
}
