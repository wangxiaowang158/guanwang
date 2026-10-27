// 后台内容管理接口 —— /api/mgmt/content/*
// 需管理员登录（scope=admin），并按「该内容所属顶级栏目」校验权限：
// SRS 3.4 规定内容管理可按栏目分别授予，故用 ChannelPermGuard 做动态校验，
// 不能整体挂「栏目管理」——那是维护栏目结构本身的权限，两者不是一回事。
import { BadRequestException, Body, Controller, Delete, Get, Post, Put, Query, UseGuards } from '@nestjs/common'
import { CurrentAdmin } from '../../common/decorators/current-admin.decorator'
import { AdminGuard, type CurrentAdminInfo } from '../../common/guards/admin.guard'
import { raw } from '../../common/interceptors/transform.interceptor'
import { ChannelPermGuard } from './guards/channel-perm.guard'
import { ChannelService } from './channel.service'
import { ContentService, TRASH_RETENTION_DAYS } from './content.service'
import { issuePreviewToken } from './preview-token'
import { SiteConfigService } from './site-config.service'
import { normalizeOrigin } from './site-origin'
import {
  BatchStatusDto, ContentDetailQueryDto, ContentListQueryDto, DuplicateContentDto,
  RevisionListQueryDto, RevisionRefDto, SaveContentDto, ToggleTopDto, TrashBatchDto,
  TrashListQueryDto, UpdateSortDto,
} from './dto/content.dto'
import { CONTENT_STATUS } from '../../common/enums'
import { formatDateTime, toContentVo } from './vo/cms.vo'

@Controller('mgmt/content')
@UseGuards(AdminGuard, ChannelPermGuard)
export class MgmtContentController {
  constructor(
    private readonly service: ContentService,
    private readonly channels: ChannelService,
    private readonly siteConfig: SiteConfigService,
  ) {}

  /**
   * 草稿预览链接：签发该栏目所在页面的短时令牌（30 分钟）
   * 权限与内容编辑同口径（ChannelPermGuard 按 channelKey 校验）：能改这个栏目的内容，才能预览它的草稿
   * origin 取基本信息里的「网址」，后台未配置时为空，由后台前端回落到自身配置的官网地址
   */
  @Get('preview-link')
  async previewLink(@Query('channelKey') channelKey: string) {
    const page = await this.channels.portalPageOf(channelKey)
    if (!page) throw new BadRequestException('该栏目不在官网页面上，没有可预览的页面')
    const { token, expiresAt } = issuePreviewToken(page.key)
    const origin = normalizeOrigin((await this.siteConfig.get()).website)
    return { origin, path: page.path, anchor: page.anchor, token, expiresAt }
  }

  /** 某栏目的内容列表，服务端分页 */
  @Get('list')
  async list(@Query() query: ContentListQueryDto) {
    const { list, total, page, pageSize } = await this.service.list(query)
    return { list: list.map(toContentVo), total, page, pageSize }
  }

  /** 单条内容详情；不传 id 时返回该栏目首条（单页型栏目用） */
  @Get('detail')
  async detail(@Query() query: ContentDetailQueryDto) {
    const found = await this.service.detail(query)
    return found ? toContentVo(found) : null
  }

  /** 保存内容：带 id 为更新，不带为新增；更新前的旧值记入历史版本 */
  @Post('save')
  async save(@Body() dto: SaveContentDto, @CurrentAdmin() admin: CurrentAdminInfo) {
    const saved = await this.service.save(dto, admin.name || admin.account)
    return raw(toContentVo(saved), '保存成功')
  }

  /** 回收站列表 */
  @Get('trash')
  async trash(@Query() query: TrashListQueryDto) {
    const { list, total, page, pageSize } = await this.service.trashList(query)
    return {
      list: list.map(c => ({ ...toContentVo(c), deletedAt: c.deletedAt ? formatDateTime(c.deletedAt) : '' })),
      total,
      page,
      pageSize,
      retentionDays: TRASH_RETENTION_DAYS,
    }
  }

  /** 从回收站恢复 */
  @Put('trash/restore')
  async restoreTrash(@Body() dto: TrashBatchDto) {
    const n = await this.service.restore(dto.channelKey, dto.ids)
    return raw({ changed: n }, n ? `已恢复 ${n} 条` : '所选内容已不在回收站')
  }

  /** 彻底删除（仅限回收站内的内容，不可恢复） */
  @Delete('trash/purge')
  async purgeTrash(@Body() dto: TrashBatchDto) {
    const n = await this.service.purge(dto.channelKey, dto.ids)
    return raw({ changed: n }, n ? `已彻底删除 ${n} 条` : '所选内容已不在回收站')
  }

  /** 某条内容的历史版本列表 */
  @Get('revisions')
  async revisions(@Query() query: RevisionListQueryDto) {
    const rows = await this.service.revisions(query.channelKey, query.id)
    return rows.map(r => ({ id: r.id, title: r.title, operator: r.operator, createdAt: formatDateTime(r.createdAt) }))
  }

  /** 历史版本快照，供后台预览对比 */
  @Get('revision')
  async revision(@Query() query: RevisionRefDto) {
    return this.service.revisionDetail(query.channelKey, query.revisionId)
  }

  /** 恢复到某个历史版本（当前值会先记成一个新版本） */
  @Post('revision/restore')
  async restoreRevision(@Body() dto: RevisionRefDto, @CurrentAdmin() admin: CurrentAdminInfo) {
    const saved = await this.service.restoreRevision(dto.channelKey, dto.revisionId, admin.name || admin.account)
    return raw(toContentVo(saved), '已恢复到该版本')
  }

  /** 删除内容（移入回收站），ids 为逗号分隔的 id 串 */
  @Delete('delete')
  async remove(@Query('channelKey') channelKey: string, @Query('ids') ids: string) {
    // 外部输入需校验：过滤非法值，避免把 NaN 传入查询
    const parsed = String(ids || '')
      .split(',')
      .map(s => Number(s.trim()))
      .filter(n => Number.isInteger(n) && n > 0)
    await this.service.remove(String(channelKey || ''), parsed)
    return raw(null, `已移入回收站，${TRASH_RETENTION_DAYS} 天内可恢复`)
  }

  /** 复制为草稿，返回副本供后台直接打开编辑 */
  @Post('duplicate')
  async duplicate(@Body() dto: DuplicateContentDto) {
    const copy = await this.service.duplicate(dto.channelKey, dto.id)
    return raw(toContentVo(copy), '已复制为草稿')
  }

  /** 批量发布 / 下线 */
  @Put('status')
  async batchStatus(@Body() dto: BatchStatusDto) {
    const changed = await this.service.setStatus(dto.channelKey, dto.ids, dto.status)
    const verb = dto.status === CONTENT_STATUS.PUBLISHED ? '发布' : '下线'
    return raw({ changed }, changed ? `已${verb} ${changed} 条` : `所选内容已全部是${verb}状态`)
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
