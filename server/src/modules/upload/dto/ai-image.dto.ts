// AI 生图请求 DTO
import { Transform } from 'class-transformer'
import { IsNotEmpty, IsString, Length, Matches } from 'class-validator'
import { AI_IMAGE } from '../../../config/app.config'

/** 生成候选图：只收一段简短描述 */
export class AiImageGenerateDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: '请输入图片描述' })
  @IsNotEmpty({ message: '请输入图片描述' })
  @Length(1, AI_IMAGE.promptMaxLen, { message: `图片描述不能超过 ${AI_IMAGE.promptMaxLen} 个字` })
  prompt!: string
}

/** 保存选中的候选图 */
export class AiImageSaveDto {
  @IsString({ message: '候选图标识不合法' })
  @Matches(/^[0-9a-f-]{36}$/, { message: '候选图标识不合法' })
  id!: string
}
