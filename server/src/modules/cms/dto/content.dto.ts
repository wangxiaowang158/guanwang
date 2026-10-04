// 内容管理入参校验
import { Type } from 'class-transformer'
import {
  IsBoolean, IsIn, IsInt, IsOptional, IsString, Length, Matches, Min,
} from 'class-validator'
import { CONTENT_STATUS, type ContentStatus } from '../../../common/enums'

/** 发布状态取值白名单，DTO 校验用 */
const CONTENT_STATUS_VALUES = Object.values(CONTENT_STATUS)

/** 发布时间形态：空串（清空）、日期、日期 + 时分秒；日期合法性（如 2 月 31 日）由服务层再校 */
const PUBLISH_AT_PATTERN = /^(?:\d{4}-\d{2}-\d{2}(?: \d{2}:\d{2}:\d{2})?)?$/

/** 内容列表查询 */
export class ContentListQueryDto {
  @IsString()
  @Length(1, 64)
  channelKey!: string

  @IsOptional()
  @IsString()
  @Length(0, 100)
  keyword?: string

  /** 起始日期，格式 YYYY-MM-DD */
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: '起始日期格式须为 YYYY-MM-DD' })
  startDate?: string

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: '结束日期格式须为 YYYY-MM-DD' })
  endDate?: string

  /** 发布状态筛选，不传则草稿与已发布都列出 */
  @IsOptional()
  @IsIn(CONTENT_STATUS_VALUES, { message: '发布状态取值非法' })
  status?: ContentStatus

  /** 页码，从 1 起。@Type 显式转数字：query 取到的都是字符串 */
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

/** 内容详情查询 */
export class ContentDetailQueryDto {
  @IsString()
  @Length(1, 64)
  channelKey!: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  id?: number
}

/** 保存内容：带 id 为更新，不带为新增 */
export class SaveContentDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  id?: number

  @IsString()
  @Length(1, 64)
  channelKey!: string

  @IsOptional()
  @IsString()
  @Length(0, 300)
  title?: string

  @IsOptional()
  @IsString()
  @Length(0, 300)
  name?: string

  @IsOptional()
  @IsString()
  @Length(0, 300)
  subtitle?: string

  @IsOptional()
  @IsString()
  @Length(0, 500)
  keywords?: string

  @IsOptional()
  @IsString()
  @Length(0, 2000)
  description?: string

  @IsOptional()
  @IsString()
  @Length(0, 2000)
  intro?: string

  /** 富文本正文，长度上限放宽 */
  @IsOptional()
  @IsString()
  @Length(0, 100_000)
  content?: string

  @IsOptional()
  @IsString()
  @Length(0, 1000)
  cover?: string

  /** 视频地址，前台视频板块播放源 */
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  video?: string

  @IsOptional()
  @IsString()
  @Length(0, 1000)
  whiteCover?: string

  @IsOptional()
  @IsString()
  @Length(0, 500)
  file?: string

  @IsOptional()
  @IsString()
  @Length(0, 500)
  link?: string

  @IsOptional()
  @IsString()
  @Length(0, 100)
  category?: string

  @IsOptional()
  @IsString()
  @Length(0, 64)
  icon?: string

  @IsOptional()
  @IsString()
  @Length(0, 100)
  brand?: string

  @IsOptional()
  @IsString()
  @Length(0, 100)
  author?: string

  @IsOptional()
  @IsString()
  @Length(0, 100)
  source?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sort?: number

  @IsOptional()
  @IsBoolean()
  isTop?: boolean

  /** 发布状态，不传时新增按已发布、更新保持原值 */
  @IsOptional()
  @IsIn(CONTENT_STATUS_VALUES, { message: '发布状态取值非法' })
  status?: ContentStatus

  /**
   * 发布时间，前台展示的发布日期；格式 `YYYY-MM-DD` 或 `YYYY-MM-DD HH:mm:ss`（与管理端返回的 updateTime 同形）
   * 空串或 null 表示清空，回落为创建时间；不传则更新时保持原值
   * 按服务器本地时区解释，不接受带时区后缀的串——管理端与前台展示都按本地时间，混入时区只会造成日期错位
   */
  @IsOptional()
  @IsString()
  @Matches(PUBLISH_AT_PATTERN, { message: '发布时间格式应为 YYYY-MM-DD 或 YYYY-MM-DD HH:mm:ss' })
  publishAt?: string | null
}

/** 切换置顶 */
export class ToggleTopDto {
  @IsString()
  @Length(1, 64)
  channelKey!: string

  @Type(() => Number)
  @IsInt()
  id!: number
}

/** 修改排序值 */
export class UpdateSortDto {
  @IsString()
  @Length(1, 64)
  channelKey!: string

  @Type(() => Number)
  @IsInt()
  id!: number

  @Type(() => Number)
  @IsInt()
  @Min(0)
  sort!: number
}
