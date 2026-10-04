// 会员资料与后台管理请求 DTO
import { IsEmail, IsIn, IsInt, IsOptional, IsString, Length, MaxLength, Min, ValidateIf } from 'class-validator'
import { Type } from 'class-transformer'
import { MEMBER_STATUS, type MemberStatus } from '../../../common/enums'
import {
  EMAIL_FORMAT_MESSAGE, EMAIL_LENGTH_MESSAGE, NICKNAME_LENGTH_MESSAGE, isFilled,
} from './member-auth.dto'

/** 会员修改自身资料 */
export class UpdateProfileDto {
  // 昵称、邮箱规则与注册（RegisterDto）一致，SRS 要求两处口径统一
  @IsOptional()
  @IsString()
  @Length(2, 20, { message: NICKNAME_LENGTH_MESSAGE })
  nickname?: string

  /** 邮箱，空串表示清空（service 中落为 null） */
  @ValidateIf(isFilled)
  @IsString()
  @MaxLength(100, { message: EMAIL_LENGTH_MESSAGE })
  @IsEmail({}, { message: EMAIL_FORMAT_MESSAGE })
  email?: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  avatar?: string
}

/** 会员修改自身密码 */
export class ChangePasswordDto {
  @IsString()
  @MaxLength(50)
  oldPassword!: string

  @IsString()
  @Length(6, 50, { message: '密码长度需为 6-50 位' })
  newPassword!: string
}

/** 后台会员列表查询；query 参数统一声明为 string 并转换 */
export class MemberQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  keyword?: string

  @IsOptional()
  @IsIn(Object.values(MEMBER_STATUS), { message: '状态取值不支持' })
  status?: MemberStatus

  @IsOptional()
  @IsString()
  startDate?: string

  @IsOptional()
  @IsString()
  endDate?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number
}

/** 后台变更会员状态 */
export class UpdateMemberStatusDto {
  @IsIn(Object.values(MEMBER_STATUS), { message: '状态取值不支持' })
  status!: MemberStatus
}

/** 后台重置会员密码 */
export class AdminResetPasswordDto {
  @IsString()
  @Length(6, 50, { message: '密码长度需为 6-50 位' })
  newPassword!: string
}
