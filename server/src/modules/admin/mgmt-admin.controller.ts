// 后台管理员账号维护接口 —— /api/mgmt/admin/*
// 「管理员管理」属系统级模块，不在可授权范围内（见 admin 端 NON_GRANTABLE_CHANNEL_TYPES），
// 故不用 @RequirePerm 而是直接要求超管身份。
import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common'
import { AdminService } from './admin.service'
import { AdminGuard, type CurrentAdminInfo } from '../../common/guards/admin.guard'
import { CurrentAdmin } from '../../common/decorators/current-admin.decorator'
import { raw } from '../../common/interceptors/transform.interceptor'
import { toAdminVo } from './vo/admin.vo'
import { CreateAdminDto, ResetAdminPasswordDto, UpdateAdminDto } from './dto/admin.dto'

@Controller('mgmt/admin')
@UseGuards(AdminGuard)
export class MgmtAdminController {
  constructor(private readonly service: AdminService) {}

  /** 非超管一律拒绝访问本模块 */
  private assertSuper(admin: CurrentAdminInfo): void {
    if (!admin.isSuper) throw new ForbiddenException('仅超级管理员可维护后台账号')
  }

  /** 管理员列表，支持账号或名称关键字筛选 */
  @Get('list')
  async list(@CurrentAdmin() admin: CurrentAdminInfo, @Query('keyword') keyword?: string) {
    this.assertSuper(admin)
    const rows = await this.service.list(keyword)
    return rows.map(toAdminVo)
  }

  /** 管理员详情 */
  @Get('detail')
  async detail(@CurrentAdmin() admin: CurrentAdminInfo, @Query('id') id: string) {
    this.assertSuper(admin)
    const found = await this.service.findById(Number(id))
    return toAdminVo(found)
  }

  /** 新增管理员 */
  @Post('add')
  async add(@CurrentAdmin() admin: CurrentAdminInfo, @Body() dto: CreateAdminDto) {
    this.assertSuper(admin)
    const created = await this.service.create(dto)
    return raw(toAdminVo(created), '新增成功')
  }

  /** 更新管理员资料与权限 */
  @Put('update')
  async update(
    @CurrentAdmin() admin: CurrentAdminInfo,
    @Body() body: UpdateAdminDto & { id: number },
  ) {
    this.assertSuper(admin)
    const saved = await this.service.update(Number(body.id), body)
    return raw(toAdminVo(saved), '保存成功')
  }

  /** 重置指定管理员密码 */
  @Put('reset-password')
  async resetPassword(
    @CurrentAdmin() admin: CurrentAdminInfo,
    @Body() body: ResetAdminPasswordDto & { id: number },
  ) {
    this.assertSuper(admin)
    await this.service.resetPassword(Number(body.id), body.password)
    return raw(null, '密码已重置')
  }

  /** 删除管理员；不可删除自己，也不可删除超管 */
  @Delete('delete')
  async remove(@CurrentAdmin() admin: CurrentAdminInfo, @Query('id') id: string) {
    this.assertSuper(admin)
    const targetId = Number(id)
    if (targetId === admin.id) throw new ForbiddenException('不可删除当前登录账号')
    await this.service.remove(targetId)
    return raw(null, '删除成功')
  }
}
