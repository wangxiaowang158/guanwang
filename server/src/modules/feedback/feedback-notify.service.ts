// 反馈到达通知 —— 新反馈落库后向群机器人推一条消息
// 不配置 FEEDBACK_NOTIFY_WEBHOOK 时整体静默跳过：官网可以没有通知，
// 但绝不能因为通知不通而让客户的留言提交失败。
//
// 所有异常都在本服务内消化，对外只暴露一个不会 reject 的方法，
// 调用方（FeedbackService）不必也不应该处理通知失败。
import { Injectable, Logger } from '@nestjs/common'
import { FEEDBACK_NOTIFY } from '../../config/app.config'
import { FEEDBACK_SOURCE, type FeedbackSource } from '../../common/enums'

/** 通知内容所需的反馈摘要 */
export interface FeedbackNotifyPayload {
  id: number
  source: FeedbackSource
  name: string
  /** 会员未填且账号未绑手机号时可能为空 */
  phone: string | null
  content: string
}

/** 正文摘要上限：群消息过长会被折叠，留个够用的长度 */
const CONTENT_PREVIEW_LIMIT = 120

@Injectable()
export class FeedbackNotifyService {
  private readonly logger = new Logger(FeedbackNotifyService.name)

  /** 是否已配置通知通道 */
  private get enabled(): boolean {
    return FEEDBACK_NOTIFY.webhookUrl.length > 0
  }

  /**
   * 推送新反馈通知，失败只记日志不抛错
   * 调用方无需 await（也可以 await，本方法不会 reject）
   * @param payload 反馈摘要
   */
  async notify(payload: FeedbackNotifyPayload): Promise<void> {
    if (!this.enabled) return

    try {
      await this.post(this.buildBody(this.buildText(payload)))
    } catch (err) {
      // 通知失败不影响业务，只留日志供排查；不打印 webhook 地址，其中含密钥
      const reason = err instanceof Error ? err.message : String(err)
      this.logger.warn(`反馈通知推送失败（反馈 #${payload.id}）：${reason}`)
    }
  }

  /**
   * 拼通知正文
   * 只放定位所需的最少信息：手机号属个人信息，群里不回显完整号码，
   * 需要联系时到后台看详情
   * @param p 反馈摘要
   */
  private buildText(p: FeedbackNotifyPayload): string {
    const sourceLabel = p.source === FEEDBACK_SOURCE.MEMBER ? '会员反馈' : '匿名咨询'
    const preview =
      p.content.length > CONTENT_PREVIEW_LIMIT
        ? `${p.content.slice(0, CONTENT_PREVIEW_LIMIT)}…`
        : p.content
    return [
      `【官网新反馈】${sourceLabel}`,
      `编号：#${p.id}`,
      `提交人：${p.name}`,
      `联系电话：${maskPhone(p.phone)}`,
      `内容：${preview}`,
      '请登录管理后台「意见反馈」查看并处理。',
    ].join('\n')
  }

  /**
   * 按机器人类型组装请求体
   * 飞书的字段名与企业微信/钉钉不同，后两者的文本消息结构一致；
   * 未识别的类型按企业微信格式发，发不通会在 post 里记日志，不会静默丢消息
   * @param text 通知正文
   */
  private buildBody(text: string): Record<string, unknown> {
    if (FEEDBACK_NOTIFY.type === 'feishu') {
      return { msg_type: 'text', content: { text } }
    }
    return { msgtype: 'text', text: { content: text } }
  }

  /**
   * 发起 webhook 请求
   * 带超时：通知通道不可达时若不设上限，会一直占着连接
   * @param body 请求体
   */
  private async post(body: Record<string, unknown>): Promise<void> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), FEEDBACK_NOTIFY.timeoutMs)
    try {
      const res = await fetch(FEEDBACK_NOTIFY.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
    } finally {
      clearTimeout(timer)
    }
  }
}

/**
 * 手机号中间四位打码
 * 通知发到群里，完整号码属不必要的个人信息扩散
 * @param phone 原手机号，可能为空或非 11 位
 */
function maskPhone(phone: string | null): string {
  if (!phone || phone.length < 7) return phone || '未填写'
  return `${phone.slice(0, 3)}****${phone.slice(-4)}`
}
