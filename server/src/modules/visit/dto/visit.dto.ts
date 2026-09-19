// 访问统计请求 DTO
import { Type } from 'class-transformer'
import { IsIn, IsOptional, IsString, Length, Matches } from 'class-validator'

/** 日期格式 YYYY-MM-DD */
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

/** 前台访问上报 */
export class RecordVisitDto {
  /** 被访问的一级栏目 key，合法性由服务端对照栏目表校验 */
  @IsString()
  @Length(1, 64)
  channelKey!: string
}

/** 访问统计查询：range 快捷范围，或 startDate + endDate 自定义 */
export class VisitStatsQueryDto {
  /** 快捷范围天数，仅允许 7 与 30；与自定义日期同传时以自定义为准 */
  @IsOptional()
  @Type(() => Number)
  @IsIn([7, 30], { message: '统计范围仅支持近 7 日与近 30 日' })
  range?: number

  /** 起始日期 */
  @IsOptional()
  @Matches(DATE_PATTERN, { message: '起始日期格式应为 YYYY-MM-DD' })
  startDate?: string

  /** 结束日期 */
  @IsOptional()
  @Matches(DATE_PATTERN, { message: '结束日期格式应为 YYYY-MM-DD' })
  endDate?: string
}

/** 仪表盘趋势查询 */
export class TrendQueryDto {
  /** 趋势天数，仅允许 7 与 30 */
  @IsOptional()
  @Type(() => Number)
  @IsIn([7, 30], { message: '趋势范围仅支持近 7 日与近 30 日' })
  range?: number
}
