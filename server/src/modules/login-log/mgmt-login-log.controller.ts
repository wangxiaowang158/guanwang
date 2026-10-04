// 后台登录日志接口 —— /api/mgmt/login-log/*
// 只读 + 按日期清理，无新增与编辑
import { Controller, Delete, ForbiddenException, Get, Query, UseGuards } from '@nestjs/common'
import { Type } from 'class-transformer'
import { IsIn, IsInt, IsOptional, IsString, Matches, MaxLength, Min } from 'class-validator'
import { LoginLogService } from './login-log.service'
import { AdminGuard, type CurrentAdminInfo } from '../../common/guards/admin.guard'
import { CurrentAdmin } from '../../common/decorators/current-admin.decorator'
import { PermGuard } from '../../common/guards/perm.guard'
import { PERM, RequirePerm } from '../../common/decorators/require-perm.decorator'
import { raw } from '../../common/interceptors/transform.interceptor'
import { LOGIN_RESULT, type LoginResult } from '../../common/enums'

/** 日期格式：YYYY-MM-DD */
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/

/** 日志查询参数（导出供单测直接校验，与其余模块的 DTO 一致） */
export class LogQueryDto {
  /** 关键词：匹配会员昵称、登录账号与登录 IP；上限与会员、反馈两处查询保持一致 */
  @IsOptional()
  @IsString()
  @MaxLength(50)
  keyword?: string

  @IsOptional()
  @IsIn(Object.values(LOGIN_RESULT), { message: '登录结果取值不支持' })
  result?: LoginResult

  @IsOptional()
  @Matches(DATE_REGEX, { message: '开始日期格式不正确' })
  startDate?: string

  @IsOptional()
  @Matches(DATE_REGEX, { message: '结束日期格式不正确' })
  endDate?: string

  /**
   * 页码，从 1 起
   * 显式转数字并校验整数：query 取到的都是字符串，`?page=abc` 经 Number() 得 NaN，
   * NaN 进 TypeORM 的 skip() 会抛 TypeORMError 打 500，故在 DTO 层就拒掉
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
class ClearLogDto {
  @Matches(DATE_REGEX, { message: '日期格式不正确' })
  before!: string
}

@Controller('mgmt/login-log')
@UseGuards(AdminGuard, PermGuard)
@RequirePerm(PERM.MEMBER_CENTER)
export class MgmtLoginLogController {
  constructor(private readonly service: LoginLogService) {}

  /** 登录日志列表 */
  @Get('list')
  list(@Query() query: LogQueryDto) {
    return this.service.list({
      keyword: query.keyword,
      result: query.result,
      startDate: query.startDate,
      endDate: query.endDate,
      page: query.page,
      pageSize: query.pageSize,
    })
  }

  /** 清理指定日期之前的日志 */
  @Delete('clear')
  async clear(@CurrentAdmin() admin: CurrentAdminInfo, @Query() query: ClearLogDto) {
    // 登录日志是审计数据，与操作日志同一口径只许超管清理：
    // 有会员中心权限即可清，等于能自己抹掉排查撞库、盗号的线索
    if (!admin.isSuper) throw new ForbiddenException('仅超级管理员可清理登录日志')
    const count = await this.service.clearBefore(query.before)
    return raw({ count }, `已清理 ${count} 条日志`)
  }
}
