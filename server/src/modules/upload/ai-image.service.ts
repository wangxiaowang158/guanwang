// AI 生图服务 —— 调用 OpenAI 兼容的 /images/generations，候选图暂存内存，选中后才落盘
// 候选只留服务端内存并按 id 引用：保存时前端只回传 id，既省掉几 MB 的回传，
// 也让「保存」接口无法被拿来上传任意内容
import { randomUUID } from 'node:crypto'
import { BadGatewayException, BadRequestException, Injectable, Logger } from '@nestjs/common'
import { AI_IMAGE, UPLOAD } from '../../config/app.config'
import { UploadService } from './upload.service'

/** 候选图的前端展示项：id 用于保存，previewUrl 为 data URL 仅供预览 */
export interface AiImageCandidate {
  id: string
  previewUrl: string
}

interface CachedCandidate {
  buffer: Buffer
  mimetype: string
  expireAt: number
}

/**
 * 上游返回的图片字节上限，防止异常响应撑爆内存
 * 有意高于 UPLOAD.maxMb：AI 出图的 PNG 常超 2MB，且来自受信上游而非用户上传
 */
const MAX_IMAGE_BYTES = 12 * 1024 * 1024

@Injectable()
export class AiImageService {
  private readonly logger = new Logger(AiImageService.name)
  private readonly cache = new Map<string, CachedCandidate>()

  constructor(private readonly uploadService: UploadService) {}

  /** 是否已配置密钥；未配置时前端据此显示「未启用」 */
  isEnabled(): boolean {
    return AI_IMAGE.apiKey.length > 0
  }

  /**
   * 按描述生成一批候选图
   * @param prompt 已通过 DTO 校验的描述文本
   * @returns 候选图列表（预览用 data URL）
   */
  async generate(prompt: string): Promise<AiImageCandidate[]> {
    if (!this.isEnabled()) {
      throw new BadRequestException('未配置 AI 生图服务，请联系管理员在服务端设置 AI_IMAGE_API_KEY')
    }
    const items = await this.callUpstream(prompt)
    this.evictExpired()
    const result: AiImageCandidate[] = []
    for (const b64 of items) {
      // 解码前按长度估算字节数，超限直接跳过，避免先分配大块内存
      if (b64.length * 0.75 > MAX_IMAGE_BYTES) continue
      const buffer = Buffer.from(b64, 'base64')
      const mimetype = sniffMime(buffer)
      if (!mimetype || buffer.length === 0 || buffer.length > MAX_IMAGE_BYTES) continue
      const id = randomUUID()
      this.cache.set(id, { buffer, mimetype, expireAt: Date.now() + AI_IMAGE.candidateTtlMs })
      result.push({ id, previewUrl: `data:${mimetype};base64,${b64}` })
    }
    this.trimOverflow()
    if (result.length === 0) throw new BadGatewayException('生图服务未返回可用图片，请稍后重试')
    return result
  }

  /**
   * 把选中的候选图落盘并返回站内地址
   * @param id generate 返回的候选 id
   */
  async saveCandidate(id: string): Promise<string> {
    const hit = this.cache.get(id)
    if (!hit || hit.expireAt < Date.now()) {
      this.cache.delete(id)
      throw new BadRequestException('候选图已过期，请重新生成')
    }
    const url = await this.uploadService.saveImage({
      buffer: hit.buffer,
      mimetype: hit.mimetype,
    } as Express.Multer.File)
    // 落盘成功后即释放，同一张图重复应用会得到「已过期」而不是产生重复文件
    this.cache.delete(id)
    return url
  }

  /** 调用上游，返回 base64 图片数组；上游报错只记日志，不把原文透给前端 */
  private async callUpstream(prompt: string): Promise<string[]> {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), AI_IMAGE.timeoutMs)
    try {
      const res = await fetch(`${AI_IMAGE.baseUrl}/images/generations`, {
        method: 'POST',
        signal: ctrl.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${AI_IMAGE.apiKey}`,
        },
        body: JSON.stringify({
          model: AI_IMAGE.model,
          prompt: buildPrompt(prompt),
          n: AI_IMAGE.count,
          size: AI_IMAGE.size,
        }),
      })
      if (!res.ok) {
        this.logger.warn(`生图上游返回 ${res.status}`)
        throw new BadGatewayException('生图服务暂时不可用，请稍后重试')
      }
      const json = (await res.json()) as { data?: Array<{ b64_json?: string }> }
      return (json.data ?? []).map((d) => d.b64_json).filter((v): v is string => !!v)
    } catch (err) {
      if (err instanceof BadGatewayException) throw err
      const timeout = (err as Error).name === 'AbortError'
      this.logger.warn(`生图请求失败：${(err as Error).message}`)
      throw new BadGatewayException(timeout ? '生图超时，请稍后重试' : '生图服务暂时不可用，请稍后重试')
    } finally {
      clearTimeout(timer)
    }
  }

  /** 清掉已过期的候选 */
  private evictExpired(): void {
    const now = Date.now()
    for (const [id, c] of this.cache) if (c.expireAt < now) this.cache.delete(id)
  }

  /** 超过总量上限时按写入顺序丢弃最早的 */
  private trimOverflow(): void {
    while (this.cache.size > AI_IMAGE.candidateMax) {
      const first = this.cache.keys().next().value
      if (first === undefined) break
      this.cache.delete(first)
    }
  }
}

/** 给描述加上封面场景约束：不要文字水印，保证后台封面可直接使用 */
function buildPrompt(prompt: string): string {
  return `${prompt}。用于企业官网内容封面，构图简洁，不要出现文字和水印。`
}

/** 按文件头识别图片 MIME，只放行上传白名单内的格式，不信任上游声明 */
function sniffMime(buf: Buffer): string | null {
  let mime: string | null = null
  if (buf.length > 12) {
    if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) mime = 'image/png'
    else if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) mime = 'image/jpeg'
    else if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') mime = 'image/webp'
  }
  return mime && (UPLOAD.imageMimes as readonly string[]).includes(mime) ? mime : null
}
