// 注册登录配置请求 DTO
import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator'

/** 更新注册登录配置；全部字段可选，仅更新传入项 */
export class UpdateAuthConfigDto {
  /** 是否开放注册 */
  @IsOptional()
  @IsBoolean()
  registerOpen?: boolean

  /** 是否允许账号密码登录 */
  @IsOptional()
  @IsBoolean()
  allowPasswordLogin?: boolean

  /** 是否允许手机验证码登录 */
  @IsOptional()
  @IsBoolean()
  allowSmsLogin?: boolean

  /** 密码最小长度 */
  @IsOptional()
  @IsInt()
  @Min(6, { message: '密码最小长度不得低于 6 位' })
  @Max(50)
  passwordMinLength?: number

  /** 密码是否必须字母数字混合 */
  @IsOptional()
  @IsBoolean()
  passwordRequireMixed?: boolean

  /** 图形验证码触发阈值 */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  captchaThreshold?: number

  /** 登录失败锁定阈值 */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  lockThreshold?: number

  /** 锁定时长（分钟） */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1440)
  lockMinutes?: number
}
