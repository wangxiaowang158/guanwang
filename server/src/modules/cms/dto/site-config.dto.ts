// 站点基本信息入参校验 —— 全部选填，只覆盖传过来的字段
// 空串一律放行：表示「清空该项」，前台按默认渲染
import {
  IsArray,
  IsEmail,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  Length,
  Matches,
  ValidateIf,
  ValidateBy,
  type ValidationOptions,
} from 'class-validator'
import { assetUrl } from '../../../common/site-layout'

/** 非空时才校验格式 */
const IfFilled = () => ValidateIf((_o, v: unknown) => v !== '' && v !== null && v !== undefined)

/** http(s) 绝对地址 */
const HTTP_URL = /^https?:\/\/[^\s\\'"<>]+$/i

/**
 * 站点域名：协议头可省（normalizeOrigin 会补 https），但主机名只许字母数字点横线，
 * 挡掉 javascript: 这类伪协议与会破坏 canonical 的字符
 */
const SITE_DOMAIN = /^(https?:\/\/)?[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+(:\d{1,5})?\/?$/i

/**
 * 素材地址：与前台/页脚共用 assetUrl 规则（站内 / 开头或 http(s)，禁引号括号空白）
 * 这些地址会被拼进 CSS url(…) 与 og:image，入库前就该挡掉
 */
function IsAssetUrl(options?: ValidationOptions) {
  return ValidateBy(
    { name: 'isAssetUrl', validator: { validate: (v: unknown) => assetUrl(v) === v } },
    { message: '图片或视频地址格式不正确', ...options },
  )
}

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

  /** 会被拼进 canonical 与 og:image 的绝对地址，填错会让分享与收录指向错误域名 */
  @IsOptional()
  @IsString()
  @Length(0, 200)
  @IfFilled()
  @Matches(SITE_DOMAIN, { message: '网站域名格式不正确，如 www.example.com 或 https://www.example.com' })
  website?: string

  @IsOptional()
  @IsString()
  @Length(0, 100)
  @IfFilled()
  @IsEmail({}, { message: '招聘邮箱格式不正确' })
  recruitEmail?: string

  @IsOptional()
  @IsString()
  @Length(0, 100)
  @IfFilled()
  @IsEmail({}, { message: '联系邮箱格式不正确' })
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
  @IfFilled()
  @Matches(HTTP_URL, { message: '地图链接须以 http:// 或 https:// 开头' })
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
  @Length(0, 500)
  @IfFilled()
  @IsAssetUrl()
  logo?: string

  @IsOptional()
  @IsString()
  @Length(0, 500)
  @IfFilled()
  @IsAssetUrl()
  footerLogo?: string

  @IsOptional()
  @IsString()
  @Length(0, 500)
  @IfFilled()
  @IsAssetUrl()
  wechatQr?: string

  @IsOptional()
  @IsString()
  @Length(0, 100, { message: '公司全称不超过 100 字' })
  companyName?: string

  @IsOptional()
  @IsString()
  @Length(0, 30, { message: '公司简称不超过 30 字' })
  companyShort?: string

  @IsOptional()
  @IsString()
  @Length(0, 50, { message: '英文名不超过 50 字' })
  companyEn?: string

  @IsOptional()
  @IsString()
  @Length(0, 500)
  @IfFilled()
  @IsAssetUrl()
  favicon?: string

  @IsOptional()
  @IsString()
  @Length(0, 500)
  @IfFilled()
  @IsAssetUrl()
  shareImage?: string

  /** 网站模板，只允许两种样式 */
  @IsOptional()
  @IsIn(['1', '2'], { message: '网站模板只能为 1 或 2' })
  template?: string

  /** 只收地址，不收 base64 内联图：内联图会让每次首页接口多背几百 KB */
  @IsOptional()
  @IsString()
  @Length(0, 500)
  @IfFilled()
  @IsAssetUrl()
  heroImage?: string

  @IsOptional()
  @IsString()
  @Length(0, 500)
  @IfFilled()
  @IsAssetUrl()
  heroVideo?: string

  @IsOptional()
  @IsString()
  @Length(0, 20, { message: '首屏按钮文字不超过 20 字' })
  heroPrimaryText?: string

  @IsOptional()
  @IsString()
  @Length(0, 20, { message: '首屏按钮文字不超过 20 字' })
  heroSecondaryText?: string

  @IsOptional()
  @IsString()
  @Length(0, 60, { message: '数据口径说明不超过 60 字' })
  heroStatsNote?: string

  @IsOptional()
  @IsString()
  @Length(0, 100, { message: '联系板块标题不超过 100 字' })
  contactHeading?: string

  /**
   * 首页布局：板块数组。结构校验由服务层 normalizeHomeLayout 收口（白名单板块、限长），这里只挡非数组
   * 传 null 或空数组即恢复默认布局
   */
  @IsOptional()
  @IsArray({ message: '首页布局格式不正确' })
  homeLayout?: unknown[] | null

  /** 页脚配置：对象。结构校验由 normalizeFooterConfig 收口；传 null 即恢复默认 */
  @IsOptional()
  @IsObject({ message: '页脚配置格式不正确' })
  footerConfig?: Record<string, unknown> | null

  /** 扩展配置（统计 / 站长验证 / 灰色模式 / 悬浮条 / 水印），由 normalizeSiteExt 逐字段白名单净化 */
  @IsOptional()
  @IsObject({ message: '扩展配置格式不正确' })
  extConfig?: Record<string, unknown> | null
}
