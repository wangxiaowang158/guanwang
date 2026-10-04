// 素材库请求 DTO
import { Transform, Type } from 'class-transformer'
import { IsBoolean, IsIn, IsOptional, IsString, Length } from 'class-validator'

/** 素材列表查询 */
export class MediaQueryDto {
  /** 类型筛选，all 或不传表示全部 */
  @IsOptional()
  @IsIn(['all', 'image', 'video', 'other'], { message: '素材类型不合法' })
  type?: 'all' | 'image' | 'video' | 'other'

  /** 文件名关键词，模糊匹配 */
  @IsOptional()
  @IsString()
  @Length(0, 128)
  keyword?: string

  /**
   * 只看无人引用的素材
   * 查询串里是字符串 'true'/'false'，@IsBoolean 不会自动转换，故手动 Transform
   */
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true' || value === '1')
  @IsBoolean()
  unusedOnly?: boolean

  /** 排序字段 */
  @IsOptional()
  @IsIn(['mtime', 'size'], { message: '排序字段仅支持上传时间与文件大小' })
  sortBy?: 'mtime' | 'size'

  /** 排序方向，默认倒序 */
  @IsOptional()
  @IsIn(['asc', 'desc'], { message: '排序方向不合法' })
  sortOrder?: 'asc' | 'desc'

  @IsOptional()
  @Type(() => Number)
  page?: number

  @IsOptional()
  @Type(() => Number)
  pageSize?: number
}

/** 删除素材 */
export class RemoveMediaDto {
  /**
   * 素材站内地址。必填且显式校验非空：
   * 这是不可逆删除，参数缺失必须明确报错，不能落到「删了个空路径」的未定义行为
   */
  @IsString({ message: '素材地址须为字符串' })
  @Length(1, 512, { message: '素材地址不合法' })
  url!: string
}
