// 站点基本信息入参校验 —— 全部选填，只覆盖传过来的字段
import { IsIn, IsOptional, IsString, Length } from 'class-validator'

export class SaveSiteConfigDto {
  @IsOptional()
  @IsString()
  @Length(0, 200)
  webTitle?: string

  @IsOptional()
  @IsString()
  @Length(0, 500)
  keywords?: string

  @IsOptional()
  @IsString()
  @Length(0, 1000)
  description?: string

  @IsOptional()
  @IsString()
  @Length(0, 200)
  slogan?: string

  @IsOptional()
  @IsString()
  @Length(0, 200)
  subSlogan?: string

  @IsOptional()
  @IsString()
  @Length(0, 50)
  phone?: string

  @IsOptional()
  @IsString()
  @Length(0, 200)
  website?: string

  @IsOptional()
  @IsString()
  @Length(0, 100)
  recruitEmail?: string

  @IsOptional()
  @IsString()
  @Length(0, 100)
  contactEmail?: string

  @IsOptional()
  @IsString()
  @Length(0, 200)
  address?: string

  @IsOptional()
  @IsString()
  @Length(0, 32)
  mapLng?: string

  @IsOptional()
  @IsString()
  @Length(0, 32)
  mapLat?: string

  @IsOptional()
  @IsString()
  @Length(0, 500)
  mapLink?: string

  @IsOptional()
  @IsString()
  @Length(0, 300)
  copyright?: string

  @IsOptional()
  @IsString()
  @Length(0, 100)
  icpCode?: string

  @IsOptional()
  @IsString()
  @Length(0, 100)
  policeCode?: string

  @IsOptional()
  @IsString()
  @Length(0, 1000)
  logo?: string

  @IsOptional()
  @IsString()
  @Length(0, 1000)
  footerLogo?: string

  @IsOptional()
  @IsString()
  @Length(0, 1000)
  wechatQr?: string

  /** 网站模板，只允许两种样式 */
  @IsOptional()
  @IsIn(['1', '2'], { message: '网站模板只能为 1 或 2' })
  template?: string

  @IsOptional()
  @IsString()
  @Length(0, 200_000)
  heroImage?: string

  @IsOptional()
  @IsString()
  @Length(0, 1000)
  heroVideo?: string
}
