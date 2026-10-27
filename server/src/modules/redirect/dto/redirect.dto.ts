// 跳转规则入参；路径形态由 service 规整与校验，这里只管类型与长度
import { Type } from 'class-transformer'
import {
  ArrayMaxSize, ArrayNotEmpty, IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, Length, Min,
} from 'class-validator'

export class RedirectListQueryDto {
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

  @IsOptional()
  @IsString()
  @Length(0, 100)
  keyword?: string
}

export class SaveRedirectDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  id?: number

  @IsString({ message: '请填写旧地址' })
  @Length(1, 300, { message: '旧地址长度须在 1~300 之间' })
  fromPath!: string

  @IsString({ message: '请填写新地址' })
  @Length(1, 500, { message: '新地址长度须在 1~500 之间' })
  toUrl!: string

  @IsOptional()
  @IsIn([301, 302], { message: '跳转类型只能是 301 或 302' })
  statusCode?: number

  @IsOptional()
  @IsBoolean()
  enabled?: boolean

  @IsOptional()
  @IsString()
  @Length(0, 100, { message: '备注不能超过 100 个字' })
  remark?: string
}

export class RemoveRedirectDto {
  @IsArray()
  @ArrayNotEmpty({ message: '请选择要删除的规则' })
  @ArrayMaxSize(200)
  @Type(() => Number)
  @IsInt({ each: true })
  ids!: number[]
}
