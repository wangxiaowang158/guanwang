// 图形验证码服务 —— 连续登录失败达阈值后启用
// 不引入图片生成依赖：后端下发算式文本与会话标识，前端渲染为图形并回传答案。
// 校验一次即失效，防止同一验证码重复使用。
//
// 存储走 KvStore（配了 REDIS_URL 即用 Redis，否则进程内存）：
// 原先用进程内 Map，重启即丢、多实例下发码与校验落在不同进程必然失败。
import { Inject, Injectable } from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import { KV_STORE, type KvStore } from '../kv/kv-store.interface'

/** 验证码有效期（毫秒） */
const CAPTCHA_TTL_MS = 3 * 60 * 1000

/**
 * 键名前缀，与短信验证码分开命名空间
 * 导出供冒烟脚本按 id 取答案用——脚本要模拟「用户正确识图」，
 * 而验证码只存在于存储层，没有别的途径能拿到答案
 */
export const CAPTCHA_KEY_PREFIX = 'captcha:'

/** 下发给前端的验证码题目 */
export interface CaptchaChallenge {
  captchaId: string
  question: string
}

@Injectable()
export class CaptchaService {
  constructor(@Inject(KV_STORE) private readonly kv: KvStore) {}

  /** 生成一道加法算式验证码 */
  async issue(): Promise<CaptchaChallenge> {
    const a = Math.floor(Math.random() * 10) + 1
    const b = Math.floor(Math.random() * 10) + 1
    const captchaId = randomUUID()
    // 过期由存储层的 TTL 负责，不再需要手工清扫
    await this.kv.set(`${CAPTCHA_KEY_PREFIX}${captchaId}`, String(a + b), CAPTCHA_TTL_MS)
    return { captchaId, question: `${a} + ${b} = ?` }
  }

  /**
   * 校验验证码；无论成败都使其失效，避免重复尝试
   * @param captchaId 下发时返回的会话标识
   * @param answer 用户填写的答案
   * @returns 校验失败时返回中文提示，成功返回 null
   */
  async verify(captchaId: string | undefined, answer: string | undefined): Promise<string | null> {
    if (!captchaId || !answer) return '请输入图形验证码'

    // 取值与删除必须原子：分两步做的话，并发提交同一验证码时
    // 两个请求都能读到值，等于这一个验证码能用两次
    const expected = await this.kv.getAndDel(`${CAPTCHA_KEY_PREFIX}${captchaId}`)

    if (expected === null) return '图形验证码已失效，请刷新重试'
    if (expected !== answer.trim()) return '图形验证码错误'
    return null
  }
}
