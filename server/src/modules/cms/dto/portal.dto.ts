// 前台只读接口入参校验
// 与 content.dto.ts 分开：那份是后台 CRUD 入参，两者字段约束与可信度不同
import { Type } from 'class-transformer'
import { IsInt, IsOptional, IsString, Length, Min } from 'class-validator'

/** 栏目页单区块续页查询 */
export class BlockItemsQueryDto {
  /** 子栏目 key，长度上限与栏目表字段一致 */
  @IsString()
  @Length(1, 64)
  channelKey!: string

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

  /**
   * 分类筛选值，取自同级分类栏目的条目标题
   * 长度上限与 content.category 列一致，超长的一律按非法入参挡掉
   */
  @IsOptional()
  @IsString()
  @Length(1, 100)
  category?: string
}
