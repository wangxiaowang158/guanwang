// AI 生图请求 DTO
import { Transform } from 'class-transformer'
import { IsIn, IsNotEmpty, IsOptional, IsString, Length, Matches } from 'class-validator'
import { AI_IMAGE, AI_IMAGE_SCENES, type AiImageScene } from '../../../config/app.config'

/** 生成候选图：一段简短描述 + 可选的使用场景（缺省按封面） */
export class AiImageGenerateDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: '请输入图片描述' })
  @IsNotEmpty({ message: '请输入图片描述' })
  @Length(1, AI_IMAGE.promptMaxLen, { message: `图片描述不能超过 ${AI_IMAGE.promptMaxLen} 个字` })
  prompt!: string

  @IsOptional()
  @IsIn(Object.keys(AI_IMAGE_SCENES), { message: '图片用途不合法' })
  scene?: AiImageScene
}

/** 保存选中的候选图 */
export class AiImageSaveDto {
  @IsString({ message: '候选图标识不合法' })
  @Matches(/^[0-9a-f-]{36}$/, { message: '候选图标识不合法' })
  id!: string
}
