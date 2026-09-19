// 后台反馈管理接口 —— /api/mgmt/feedback/*
// 需管理员登录（scope=admin）且被授予「会员中心」权限
import {
  Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, Res, UseGuards,
} from '@nestjs/common'
import type { Response } from 'express'
import { FeedbackService } from './feedback.service'
import { FeedbackExportService } from './feedback-export.service'
import { AdminGuard } from '../../common/guards/admin.guard'
import { PermGuard } from '../../common/guards/perm.guard'
import { PERM, RequirePerm } from '../../common/decorators/require-perm.decorator'
import { raw } from '../../common/interceptors/transform.interceptor'
import { FeedbackQueryDto, ReplyFeedbackDto, UpdateFeedbackStatusDto } from './dto/feedback.dto'

@Controller('mgmt/feedback')
@UseGuards(AdminGuard, PermGuard)
@RequirePerm(PERM.MEMBER_CENTER)
export class MgmtFeedbackController {
  constructor(
    private readonly service: FeedbackService,
    private readonly exportService: FeedbackExportService,
  ) {}

  /** 反馈列表（分页 + 来源/状态/类型/关键词/日期筛选） */
  @Get('list')
  list(@Query() query: FeedbackQueryDto) {
    return this.service.list(query)
  }

  /**
   * 导出反馈（xlsx）。筛选条件与列表一致，不含提交 IP
   * 手动写响应而非 return：统一响应拦截器会把返回值包成 JSON，文件流须绕开
   */
  @Get('export')
  async exportXlsx(@Query() query: FeedbackQueryDto, @Res() res: Response) {
    const items = await this.service.listForExport(query)
    if (items.length === 0) {
      res.status(200).json({ code: 400, message: '暂无可导出的数据', data: null })
      return
    }

    const buffer = await this.exportService.build(items)
    const fileName = this.exportService.buildFileName()
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    // 中文文件名需 RFC 5987 编码，filename 退化为 ASCII 供旧浏览器识别
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="feedback.xlsx"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    )
    res.setHeader('Content-Length', String(buffer.length))
    res.end(buffer)
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
