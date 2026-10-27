// 管理员登录与账号维护请求 DTO
import { Type } from 'class-transformer'
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  Min,
} from 'class-validator'

/** 管理员列表查询条件 */
export class AdminListQueryDto {
  /** 关键词：匹配账号与名称；上限与会员、反馈两处查询保持一致 */
  @IsOptional()
  @IsString()
  @MaxLength(50)
  keyword?: string

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

/** 管理员登录 */
export class AdminLoginDto {
  @IsString()
  @IsNotEmpty({ message: '请输入账号' })
  @MaxLength(50)
  username!: string

  @IsString()
  @IsNotEmpty({ message: '请输入密码' })
  @MaxLength(100)
  password!: string
}

/** 新增管理员 */
export class CreateAdminDto {
  @IsString()
  @Length(3, 50, { message: '账号长度需为 3-50 位' })
  account!: string

  @IsString()
  @Length(2, 50, { message: '名称长度需为 2-50 位' })
  name!: string

  @IsString()
  @Length(8, 100, { message: '密码长度不得少于 8 位' })
  password!: string

  /** 授权的一级菜单名清单 */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  perms?: string[]

  /** 所属角色 id，不传或 null 表示不套角色 */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  roleId?: number | null

  @IsOptional()
  @IsBoolean()
  wechatBound?: boolean
}

/**
 * 目标账号 id
 * 写进 DTO 而不是在控制器里用 `Dto & { id }` 交叉类型：交叉类型反射出的元类型是 Object，
 * ValidationPipe 会整体跳过校验——密码下限、perms 格式全部失效
 */
class AdminIdDto {
  @Type(() => Number)
  @IsInt({ message: '账号 id 不合法' })
  @Min(1, { message: '账号 id 不合法' })
  id!: number
}

/** 更新管理员；不含密码，密码走独立接口 */
export class UpdateAdminDto extends AdminIdDto {
  @IsOptional()
  @IsString()
  @Length(2, 50, { message: '名称长度需为 2-50 位' })
  name?: string

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  perms?: string[]

  /** 所属角色 id；传 null 表示取消角色 */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  roleId?: number | null

  @IsOptional()
  @IsBoolean()
  wechatBound?: boolean
}

/** 新增 / 修改角色 */
export class SaveRoleDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id?: number

  @IsString()
  @Length(1, 50, { message: '角色名长度需为 1-50 位' })
  name!: string

  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  perms!: string[]

  @IsOptional()
  @IsString()
  @MaxLength(200, { message: '说明不能超过 200 个字' })
  remark?: string
}

/** 管理员重置某账号密码（由其他管理员操作） */
export class ResetAdminPasswordDto extends AdminIdDto {
  @IsString()
  @Length(8, 100, { message: '密码长度不得少于 8 位' })
  password!: string
}

/** 当前管理员修改自己的密码 */
export class ChangeOwnPasswordDto {
  @IsString()
  @IsNotEmpty({ message: '请输入原密码' })
  oldPassword!: string

  @IsString()
  @Length(8, 100, { message: '新密码长度不得少于 8 位' })
  newPassword!: string
}
