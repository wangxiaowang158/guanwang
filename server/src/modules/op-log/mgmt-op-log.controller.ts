// 后台操作日志接口 —— /api/mgmt/op-log/*
// 只读 + 按日期清理，无新增与编辑；日志由拦截器自动写入
import { Controller, Delete, ForbiddenException, Get, Query, UseGuards } from '@nestjs/common'
import { Type } from 'class-transformer'
import { IsIn, IsInt, IsOptional, IsString, Matches, MaxLength, Min } from 'class-validator'
import { OpLogService } from './op-log.service'
import { allOpLogModules } from './op-log-catalog'
import { AdminGuard } from '../../common/guards/admin.guard'
import { CurrentAdmin } from '../../common/decorators/current-admin.decorator'
import type { CurrentAdminInfo } from '../../common/guards/admin.guard'
import { raw } from '../../common/interceptors/transform.interceptor'
import { OP_LOG_RESULT, type OpLogResult } from '../../common/enums'

/** 日期格式：YYYY-MM-DD */
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/

/** 日志查询参数（导出供单测直接校验，与其余模块的 DTO 一致） */
export class OpLogQueryDto {
  /** 关键词：匹配操作人账号、姓名、操作说明与 IP */
  @IsOptional()
  @IsString()
  @MaxLength(50)
  keyword?: string

  @IsOptional()
  @IsString()
  @MaxLength(50)
  module?: string

  @IsOptional()
  @IsIn(Object.values(OP_LOG_RESULT), { message: '操作结果取值不支持' })
  result?: OpLogResult

  @IsOptional()
  @Matches(DATE_REGEX, { message: '开始日期格式不正确' })
  startDate?: string

  @IsOptional()
  @Matches(DATE_REGEX, { message: '结束日期格式不正确' })
  endDate?: string

  /**
   * 页码，从 1 起
   * 与 login-log 同口径：query 取到的都是字符串，`?page=abc` 经 Number() 得 NaN。
   * service 侧虽有 positiveInt 兜底能回落第 1 页，但静默回落会掩盖前端传参错误，
   * 故在 DTO 层直接拒掉
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '页码须为整数' })
  @Min(1, { message: '页码须大于 0' })
  page?: number

  /** 每页条数，上限由 service 收口 */
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '每页条数须为整数' })
  @Min(1, { message: '每页条数须大于 0' })
  pageSize?: number
}

/** 清理参数 */
class ClearOpLogDto {
  @IsString()
  @Matches(DATE_REGEX, { message: '日期格式不正确' })
  before!: string
}

// 操作日志含全部管理员的行踪，属系统级模块，
// 与「管理员管理」同口径：不走可授权的菜单权限，直接要求超管身份
@Controller('mgmt/op-log')
@UseGuards(AdminGuard)
export class MgmtOpLogController {
  constructor(private readonly service: OpLogService) {}

  /** 校验超管身份；非超管一律拒绝 */
  private assertSuper(admin: CurrentAdminInfo): void {
    if (!admin.isSuper) throw new ForbiddenException('仅超级管理员可查看操作日志')
  }

  /** 操作日志列表 */
  @Get('list')
  list(@CurrentAdmin() admin: CurrentAdminInfo, @Query() query: OpLogQueryDto) {
    this.assertSuper(admin)
    return this.service.list({
      keyword: query.keyword,
      module: query.module,
      result: query.result,
      startDate: query.startDate,
      endDate: query.endDate,
      page: query.page,
      pageSize: query.pageSize,
    })
  }

  /** 可筛选的模块名列表，供前端下拉 */
  @Get('modules')
  modules(@CurrentAdmin() admin: CurrentAdminInfo) {
    this.assertSuper(admin)
    return allOpLogModules()
  }

  /** 清理指定日期之前的日志 */
  @Delete('clear')
  async clear(@CurrentAdmin() admin: CurrentAdminInfo, @Query() query: ClearOpLogDto) {
    this.assertSuper(admin)
    const count = await this.service.clearBefore(query.before)
    return raw({ count }, `已清理 ${count} 条日志`)
  }
}
