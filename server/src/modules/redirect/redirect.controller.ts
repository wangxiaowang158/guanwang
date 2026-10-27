// 跳转规则接口
// - /api/mgmt/redirect/*：后台维护，需「站点工具」权限
// - /api/portal/redirect：网关查询口，按原始地址回 301/302 或 404
import { Body, Controller, Delete, Get, Headers, Post, Query, Res, UseGuards } from '@nestjs/common'
import type { Response } from 'express'
import { AdminGuard } from '../../common/guards/admin.guard'
import { PermGuard } from '../../common/guards/perm.guard'
import { PERM, RequirePerm } from '../../common/decorators/require-perm.decorator'
import { raw } from '../../common/interceptors/transform.interceptor'
import { formatDateTime } from '../cms/vo/cms.vo'
import { RedirectListQueryDto, RemoveRedirectDto, SaveRedirectDto } from './dto/redirect.dto'
import type { RedirectRule } from './redirect.entity'
import { RedirectService } from './redirect.service'

const toVo = (r: RedirectRule) => ({
  id: r.id,
  fromPath: r.fromPath,
  toUrl: r.toUrl,
  statusCode: r.statusCode,
  enabled: r.enabled,
  remark: r.remark,
  hits: r.hits,
  lastHitAt: formatDateTime(r.lastHitAt) ?? '',
  createTime: formatDateTime(r.createdAt) ?? '',
})

@Controller('mgmt/redirect')
@UseGuards(AdminGuard, PermGuard)
@RequirePerm(PERM.SITE_TOOLS)
export class MgmtRedirectController {
  constructor(private readonly service: RedirectService) {}

  @Get('list')
  async list(@Query() query: RedirectListQueryDto) {
    const { list, total, page, pageSize } = await this.service.list(query)
    return { list: list.map(toVo), total, page, pageSize }
  }

  @Post('save')
  async save(@Body() dto: SaveRedirectDto) {
    return raw(toVo(await this.service.save(dto)), '保存成功')
  }

  @Delete('delete')
  async remove(@Body() dto: RemoveRedirectDto) {
    const n = await this.service.remove(dto.ids)
    return raw({ changed: n }, `已删除 ${n} 条`)
  }
}

@Controller('portal')
export class PortalRedirectController {
  constructor(private readonly service: RedirectService) {}

  /**
   * 网关查询口：命中回 301/302 + Location，未命中回 404（网关据此回落到前台页面）
   * 用 @Res() 手写响应：要的是真正的 HTTP 跳转，不是 JSON 信封。
   * 原始地址优先取网关传来的 X-Original-URI 头，查询串里的路径遇到 & 会被截断
   */
  @Get('redirect')
  async redirect(@Headers('x-original-uri') header: string | undefined, @Query('path') path: string | undefined, @Res() res: Response) {
    const raw = typeof header === 'string' && header ? header : typeof path === 'string' ? path : ''
    const hit = raw.length <= 1000 ? await this.service.resolve(raw) : null
    if (!hit) {
      res.status(404).end()
      return
    }
    // 301 让浏览器长缓存，改规则后老访客仍会跳旧目标；给 1 小时上限，规则改错了也能较快纠正
    res.setHeader('Cache-Control', hit.statusCode === 301 ? 'public, max-age=3600' : 'no-store')
    res.redirect(hit.statusCode, hit.location)
  }
}
