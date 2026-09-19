// 内容管理入参校验
import { Type } from 'class-transformer'
import {
  IsBoolean, IsInt, IsOptional, IsString, Length, Matches, Min,
} from 'class-validator'

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

  /** 发布时间，格式 YYYY-MM-DD 或完整时间串 */
  @IsOptional()
  @IsString()
  @Length(0, 30)
  publishAt?: string
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
