// 会员认证请求 DTO —— 全部入参在服务端校验，前端校验仅作体验优化
import { IsIn, IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator'
import { LOGIN_METHOD, type LoginMethod } from '../../../common/enums'

/** 手机号格式：中国大陆 11 位 */
const PHONE_REGEX = /^1[3-9]\d{9}$/

/** 注册请求 */
export class RegisterDto {
  /** 手机号，登录账号 */
  @Matches(PHONE_REGEX, { message: '请输入正确的手机号' })
  phone!: string

  /** 昵称 */
  @IsString()
  @Length(2, 20, { message: '昵称长度需为 2-20 字' })
  nickname!: string

  /** 密码，长度与复杂度按注册登录配置校验（在 service 中按配置二次校验） */
  @IsString()
  @Length(6, 50, { message: '密码长度需为 6-50 位' })
  password!: string

  /** 短信验证码 */
  @IsString()
  @Length(4, 6, { message: '验证码格式不正确' })
  smsCode!: string

  /** 邮箱，选填 */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  email?: string
}

/** 登录请求 */
export class LoginDto {
  /** 手机号 */
  @Matches(PHONE_REGEX, { message: '请输入正确的手机号' })
  phone!: string

  /** 登录方式 */
  @IsIn(Object.values(LOGIN_METHOD), { message: '登录方式不支持' })
  method!: LoginMethod

  /** 密码，method=password 时必填（service 中按方式校验） */
  @IsOptional()
  @IsString()
  @MaxLength(50)
  password?: string

  /** 短信验证码，method=smsCode 时必填 */
  @IsOptional()
  @IsString()
  @MaxLength(6)
  smsCode?: string

  /** 图形验证码，失败次数达阈值后必填 */
  @IsOptional()
  @IsString()
  @MaxLength(10)
  captcha?: string

  /** 图形验证码会话标识 */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  captchaId?: string
}

/** 发送短信验证码请求 */
export class SendSmsDto {
  @Matches(PHONE_REGEX, { message: '请输入正确的手机号' })
  phone!: string

  /** 用途：register 注册 / login 登录 / reset 重置密码 */
  @IsIn(['register', 'login', 'reset'], { message: '验证码用途不支持' })
  purpose!: 'register' | 'login' | 'reset'
}

/** 重置密码请求 */
export class ResetPasswordDto {
  @Matches(PHONE_REGEX, { message: '请输入正确的手机号' })
  phone!: string

  @IsString()
  @Length(4, 6, { message: '验证码格式不正确' })
  smsCode!: string

  @IsString()
  @Length(6, 50, { message: '密码长度需为 6-50 位' })
  newPassword!: string
}
