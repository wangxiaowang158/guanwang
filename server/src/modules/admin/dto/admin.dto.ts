// 管理员登录与账号维护请求 DTO
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator'

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

  @IsOptional()
  @IsBoolean()
  wechatBound?: boolean
}

/** 更新管理员；不含密码，密码走独立接口 */
export class UpdateAdminDto {
  @IsOptional()
  @IsString()
  @Length(2, 50, { message: '名称长度需为 2-50 位' })
  name?: string

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  perms?: string[]

  @IsOptional()
  @IsBoolean()
  wechatBound?: boolean
}

/** 管理员重置某账号密码（由其他管理员操作） */
export class ResetAdminPasswordDto {
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
