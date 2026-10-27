// 栏目管理入参校验
import { Type } from 'class-transformer'
import {
  IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, Length, Matches, Min,
  ArrayMaxSize, ValidateNested,
} from 'class-validator'
import { BLOCK_COLUMNS, BLOCK_LAYOUT, BLOCK_TONES, CHANNEL_TYPE, HEADING_ALIGNS } from '../../../common/enums'

const CHANNEL_TYPES = Object.values(CHANNEL_TYPE)
const BLOCK_LAYOUTS = Object.values(BLOCK_LAYOUT)

/** 页面路径入参形态：空串（清空）或 /段 或 /段/段，段为小写字母数字连字符；保留字由服务层拒绝 */
const PORTAL_PATH_INPUT = /^(?:|\/|\/[a-z0-9][a-z0-9-]{0,31}(?:\/[a-z0-9][a-z0-9-]{0,31})?)$/
const PORTAL_PATH_MESSAGE = '页面路径须形如 /energy-solutions 或 /energy-solutions/overview，只含小写字母、数字与连字符'
/** 外链入参形态：空串（清空）或 http(s) 绝对地址 */
const EXTERNAL_URL_INPUT = /^(?:|https?:\/\/\S+)$/
const EXTERNAL_URL_MESSAGE = '外链须以 http:// 或 https:// 开头'

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

  /** 前台页面路径（仅顶级栏目）：1~2 段小写路径，形态与保留字由服务层再校验 */
  @IsOptional()
  @IsString()
  @Matches(PORTAL_PATH_INPUT, { message: PORTAL_PATH_MESSAGE })
  portalPath?: string

  /** 菜单挂靠的顶级页面 key，空串表示不挂靠 */
  @IsOptional()
  @IsString()
  @Length(0, 64)
  menuParent?: string

  /** 导航外链（仅 http/https），与 portalPath 二选一 */
  @IsOptional()
  @IsString()
  @Matches(EXTERNAL_URL_INPUT, { message: EXTERNAL_URL_MESSAGE })
  @Length(0, 500)
  externalUrl?: string

  /** 头图背景图地址 */
  @IsOptional()
  @IsString()
  @Length(0, 500)
  heroBg?: string

  /** 头图背景视频地址 */
  @IsOptional()
  @IsString()
  @Length(0, 500)
  heroVideo?: string

  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9-]*$/, { message: '锚点只能包含小写字母、数字与连字符' })
  @Length(0, 64)
  anchor?: string

  @IsOptional()
  @IsString()
  @Length(0, 300)
  subheading?: string

  /** 超级下拉菜单分组名 */
  @IsOptional()
  @IsString()
  @Length(0, 50)
  menuGroup?: string

  /** 超级下拉菜单说明 */
  @IsOptional()
  @IsString()
  @Length(0, 100)
  menuDesc?: string

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

  /** 区块底色 */
  @IsOptional()
  @IsIn(['', ...BLOCK_TONES], { message: '区块底色取值不合法' })
  blockTone?: string

  /** 区块背景图（站内路径或 http/https） */
  @IsOptional()
  @IsString()
  @Length(0, 500)
  blockBg?: string

  /** 区块每行列数；0 表示恢复默认 */
  @IsOptional()
  @Type(() => Number)
  @IsIn([0, ...BLOCK_COLUMNS], { message: '每行列数只能为 2、3、4' })
  blockColumns?: number

  /** 区块标题对齐 */
  @IsOptional()
  @IsIn(['', ...HEADING_ALIGNS], { message: '标题对齐取值不合法' })
  headingAlign?: string
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

  /** 是否隐藏（仅顶级栏目；系统功能栏目与首页由服务层拒绝） */
  @IsOptional()
  @IsBoolean()
  hidden?: boolean

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

  /** 前台页面路径，规则同 CreateChannelDto */
  @IsOptional()
  @IsString()
  @Matches(PORTAL_PATH_INPUT, { message: PORTAL_PATH_MESSAGE })
  portalPath?: string

  @IsOptional()
  @IsString()
  @Length(0, 64)
  menuParent?: string

  @IsOptional()
  @IsString()
  @Matches(EXTERNAL_URL_INPUT, { message: EXTERNAL_URL_MESSAGE })
  @Length(0, 500)
  externalUrl?: string

  @IsOptional()
  @IsString()
  @Length(0, 500)
  heroBg?: string

  @IsOptional()
  @IsString()
  @Length(0, 500)
  heroVideo?: string

  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9-]*$/, { message: '锚点只能包含小写字母、数字与连字符' })
  @Length(0, 64)
  anchor?: string

  @IsOptional()
  @IsString()
  @Length(0, 300)
  subheading?: string

  /** 超级下拉菜单分组名 */
  @IsOptional()
  @IsString()
  @Length(0, 50)
  menuGroup?: string

  /** 超级下拉菜单说明 */
  @IsOptional()
  @IsString()
  @Length(0, 100)
  menuDesc?: string

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

  /** 区块底色 */
  @IsOptional()
  @IsIn(['', ...BLOCK_TONES], { message: '区块底色取值不合法' })
  blockTone?: string

  /** 区块背景图（站内路径或 http/https） */
  @IsOptional()
  @IsString()
  @Length(0, 500)
  blockBg?: string

  /** 区块每行列数；0 表示恢复默认 */
  @IsOptional()
  @Type(() => Number)
  @IsIn([0, ...BLOCK_COLUMNS], { message: '每行列数只能为 2、3、4' })
  blockColumns?: number

  /** 区块标题对齐 */
  @IsOptional()
  @IsIn(['', ...HEADING_ALIGNS], { message: '标题对齐取值不合法' })
  headingAlign?: string
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

/** 批量排序的单项 */
export class ChannelSortItemDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id!: number

  @Type(() => Number)
  @IsInt()
  @Min(0)
  sort!: number

  @IsOptional()
  @IsBoolean()
  hidden?: boolean
}

/** 批量排序：导航排序界面一次提交整组顺序与显隐 */
export class SortChannelsDto {
  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => ChannelSortItemDto)
  items!: ChannelSortItemDto[]
}
