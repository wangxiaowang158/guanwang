// 后台登录日志接口 —— /api/mgmt/login-log/*
// 只读 + 按日期清理，无新增与编辑
import { Controller, Delete, Get, Query, UseGuards } from '@nestjs/common'
import { IsIn, IsOptional, IsString, Matches } from 'class-validator'
import { LoginLogService } from './login-log.service'
import { MgmtDevGuard } from '../../common/guards/mgmt-dev.guard'
import { raw } from '../../common/interceptors/transform.interceptor'
import { LOGIN_RESULT, type LoginResult } from '../../common/enums'

/** 日期格式：YYYY-MM-DD */
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/

/** 日志查询参数 */
class LogQueryDto {
  @IsOptional()
  @IsString()
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

  @IsOptional()
  @IsString()
  page?: string

  @IsOptional()
  @IsString()
  pageSize?: string
}

/** 清理参数 */
class ClearLogDto {
  @Matches(DATE_REGEX, { message: '日期格式不正确' })
  before!: string
}

@Controller('mgmt/login-log')
@UseGuards(MgmtDevGuard)
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
      page: query.page ? Number(query.page) : undefined,
      pageSize: query.pageSize ? Number(query.pageSize) : undefined,
    })
  }

  /** 清理指定日期之前的日志 */
  @Delete('clear')
  async clear(@Query() query: ClearLogDto) {
    const count = await this.service.clearBefore(query.before)
    return raw({ count }, `已清理 ${count} 条日志`)
  }
}
