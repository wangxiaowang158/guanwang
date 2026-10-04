// 访问统计请求 DTO
import { Type } from 'class-transformer'
import { IsIn, IsNotEmpty, IsOptional, IsString, Length, Matches } from 'class-validator'

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

/** 访问日志清理：删除该日期之前的记录，不含该日 */
export class ClearVisitLogDto {
  /**
   * 分界日期，必填；与登录日志清理的参数形状保持一致
   * 这是不可逆的批量删除，故显式叠加非空与类型校验：
   * 只靠 @Matches 时，参数缺失虽也会被拒，但失败原因含糊，
   * 且一旦后续有人误加 @IsOptional 就会变成「不传即删全表」
   */
  @IsString({ message: '日期须为字符串' })
  @IsNotEmpty({ message: '必须指定清理的分界日期' })
  @Matches(DATE_PATTERN, { message: '日期格式应为 YYYY-MM-DD' })
  before!: string
}

/** 仪表盘趋势查询 */
export class TrendQueryDto {
  /** 趋势天数，仅允许 7 与 30 */
  @IsOptional()
  @Type(() => Number)
  @IsIn([7, 30], { message: '趋势范围仅支持近 7 日与近 30 日' })
  range?: number
}
