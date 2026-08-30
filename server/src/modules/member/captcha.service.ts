// 图形验证码服务 —— 连续登录失败达阈值后启用
// 不引入图片生成依赖：后端下发算式文本与会话标识，前端渲染为图形并回传答案。
// 校验一次即失效，防止同一验证码重复使用。
import { Injectable } from '@nestjs/common'
import { randomUUID } from 'node:crypto'

/** 验证码有效期（毫秒） */
const CAPTCHA_TTL_MS = 3 * 60 * 1000

/** 内存中保存的验证码记录 */
interface CaptchaRecord {
  answer: string
  expiresAt: number
}

/** 下发给前端的验证码题目 */
export interface CaptchaChallenge {
  captchaId: string
  question: string
}

@Injectable()
export class CaptchaService {
  private readonly store = new Map<string, CaptchaRecord>()

  /** 生成一道加法算式验证码 */
  issue(): CaptchaChallenge {
    this.sweep()
    const a = Math.floor(Math.random() * 10) + 1
    const b = Math.floor(Math.random() * 10) + 1
    const captchaId = randomUUID()
    this.store.set(captchaId, { answer: String(a + b), expiresAt: Date.now() + CAPTCHA_TTL_MS })
    return { captchaId, question: `${a} + ${b} = ?` }
  }

  /**
   * 校验验证码；无论成败都使其失效，避免重复尝试
   * @returns 校验失败时返回中文提示，成功返回 null
   */
  verify(captchaId: string | undefined, answer: string | undefined): string | null {
    if (!captchaId || !answer) return '请输入图形验证码'
    const record = this.store.get(captchaId)
    this.store.delete(captchaId)

    if (!record) return '图形验证码已失效，请刷新重试'
    if (Date.now() > record.expiresAt) return '图形验证码已失效，请刷新重试'
    if (record.answer !== answer.trim()) return '图形验证码错误'
    return null
  }

  /** 清理过期记录，避免内存无界增长 */
  private sweep(): void {
    const now = Date.now()
    for (const [key, record] of this.store) {
      if (now > record.expiresAt) this.store.delete(key)
    }
  }
}
