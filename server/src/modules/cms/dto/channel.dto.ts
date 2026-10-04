// 栏目管理入参校验
import { Type } from 'class-transformer'
import {
  IsArray, IsIn, IsInt, IsOptional, IsString, Length, Matches, Min,
} from 'class-validator'
import { BLOCK_LAYOUT, CHANNEL_TYPE } from '../../../common/enums'

const CHANNEL_TYPES = Object.values(CHANNEL_TYPE)
const BLOCK_LAYOUTS = Object.values(BLOCK_LAYOUT)

/** 新增栏目 */
export class CreateChannelDto {
  /** 栏目标识，仅小写字母、数字与连字符，创建后不可改 */
  @IsString()
  @Matches(/^[a-z][a-z0-9-]*$/, { message: '栏目标识须以小写字母开头，只含小写字母、数字与连字符' })
  @Length(2, 64)
  key!: string

  @IsString()
  @Length(1, 64, { message: '栏目名称长度需在 1-64 字之间' })
  name!: string

  @IsIn(CHANNEL_TYPES, { message: '栏目类型取值不合法' })
  type!: string

  /** 父栏目 id，顶级不传 */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  parentId?: number | null

  @IsOptional()
  @IsString()
  @Length(0, 64)
  icon?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sort?: number

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  formFields?: string[]

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  listColumns?: string[]

  @IsOptional()
  @IsString()
  @Length(0, 200)
  seoTitle?: string

  @IsOptional()
  @IsString()
  @Length(0, 500)
  seoKeywords?: string

  @IsOptional()
  @IsString()
  @Length(0, 1000)
  seoDescription?: string

  // 不收 portalPath：官网一级页面固定（前台路由与网关白名单写死），
  // 由种子维护；接口开放它只会造出点进去 404 的菜单项。全局 whitelist 会剥掉该字段

  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9-]*$/, { message: '锚点只能包含小写字母、数字与连字符' })
  @Length(0, 64)
  anchor?: string

  @IsOptional()
  @IsString()
  @Length(0, 300)
  subheading?: string

  @IsOptional()
  @IsIn(BLOCK_LAYOUTS, { message: '展示形态取值不合法' })
  layout?: string

  @IsOptional()
  @IsString()
  @Length(0, 100)
  heroEyebrow?: string

  @IsOptional()
  @IsString()
  @Length(0, 200)
  heroTitle?: string

  @IsOptional()
  @IsString()
  @Length(0, 1000)
  heroDesc?: string
}

/** 更新栏目：key / type / parentId 不可改，避免内容记录失联与树结构错乱 */
export class UpdateChannelDto {
  @Type(() => Number)
  @IsInt()
  id!: number

  @IsOptional()
  @IsString()
  @Length(1, 64, { message: '栏目名称长度需在 1-64 字之间' })
  name?: string

  @IsOptional()
  @IsString()
  @Length(0, 64)
  icon?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sort?: number

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  formFields?: string[]

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  listColumns?: string[]

  @IsOptional()
  @IsString()
  @Length(0, 200)
  seoTitle?: string

  @IsOptional()
  @IsString()
  @Length(0, 500)
  seoKeywords?: string

  @IsOptional()
  @IsString()
  @Length(0, 1000)
  seoDescription?: string

  // 不收 portalPath，理由见 CreateChannelDto

  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9-]*$/, { message: '锚点只能包含小写字母、数字与连字符' })
  @Length(0, 64)
  anchor?: string

  @IsOptional()
  @IsString()
  @Length(0, 300)
  subheading?: string

  @IsOptional()
  @IsIn(BLOCK_LAYOUTS, { message: '展示形态取值不合法' })
  layout?: string

  @IsOptional()
  @IsString()
  @Length(0, 100)
  heroEyebrow?: string

  @IsOptional()
  @IsString()
  @Length(0, 200)
  heroTitle?: string

  @IsOptional()
  @IsString()
  @Length(0, 1000)
  heroDesc?: string
}

/** 按 key 或 id 查询单个栏目 */
export class ChannelQueryDto {
  @IsOptional()
  @IsString()
  @Length(1, 64)
  key?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  id?: number
}
