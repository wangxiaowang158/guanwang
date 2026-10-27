// 反馈到达通知 —— 新反馈落库后向群机器人推一条消息
// 不配置 FEEDBACK_NOTIFY_WEBHOOK 时整体静默跳过：官网可以没有通知，
// 但绝不能因为通知不通而让客户的留言提交失败。
//
// 所有异常都在本服务内消化，对外只暴露一个不会 reject 的方法，
// 调用方（FeedbackService）不必也不应该处理通知失败。
import { BadRequestException, Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { FEEDBACK_NOTIFY } from '../../config/app.config'
import { FEEDBACK_SOURCE, type FeedbackSource } from '../../common/enums'
import { NotifyConfig } from './notify-config.entity'
import { checkWebhook, maskWebhook } from './notify-webhook'

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

/** 单例行固定主键 */
const SINGLETON_ID = 1

/** 实际生效的推送通道 */
interface Channel {
  url: string
  type: string
  /** 来源：后台配置 / 服务器环境变量 / 未配置 */
  from: 'admin' | 'env' | 'none'
}

/** 后台看到的推送配置：地址打码，不回显密钥 */
export interface NotifyConfigVo {
  type: string
  webhookMasked: string
  from: Channel['from']
}

@Injectable()
export class FeedbackNotifyService {
  private readonly logger = new Logger(FeedbackNotifyService.name)

  constructor(
    @InjectRepository(NotifyConfig)
    private readonly repo: Repository<NotifyConfig>,
  ) {}

  /** 当前生效的通道：后台配了用后台的，否则回落环境变量（存量部署不受影响） */
  private async channel(): Promise<Channel> {
    const row = await this.repo.findOne({ where: { id: SINGLETON_ID } }).catch(() => null)
    if (row?.webhookUrl) return { url: row.webhookUrl, type: row.type, from: 'admin' }
    if (FEEDBACK_NOTIFY.webhookUrl) return { url: FEEDBACK_NOTIFY.webhookUrl, type: FEEDBACK_NOTIFY.type, from: 'env' }
    return { url: '', type: row?.type || 'wecom', from: 'none' }
  }

  /** 后台读取配置（打码） */
  async getConfig(): Promise<NotifyConfigVo> {
    const ch = await this.channel()
    return { type: ch.type, webhookMasked: maskWebhook(ch.url), from: ch.from }
  }

  /**
   * 后台保存配置
   * @param webhookUrl 空串表示清除后台配置（回落环境变量）；undefined 表示只改类型、保留原地址
   */
  async saveConfig(type: string, webhookUrl?: string): Promise<void> {
    const row = (await this.repo.findOne({ where: { id: SINGLETON_ID } })) ?? this.repo.create({ id: SINGLETON_ID })
    const url = webhookUrl === undefined ? row.webhookUrl : webhookUrl.trim()
    if (url) {
      const err = checkWebhook(url, type)
      if (err) throw new BadRequestException(err)
    }
    row.type = type
    row.webhookUrl = url
    await this.repo.save(row)
  }

  /**
   * 发一条测试消息，结果原样告诉后台（与 notify 不同：这里要让管理员知道通不通）
   * @returns 失败原因；成功返回 null
   */
  async sendTest(): Promise<string | null> {
    const ch = await this.channel()
    if (!ch.url) return '还没有配置推送地址'
    try {
      await this.post(ch, this.buildBody(ch.type, '【官网留言推送测试】收到这条消息，说明新留言会推送到本群。'))
      return null
    } catch (err) {
      return err instanceof Error ? err.message : String(err)
    }
  }

  /**
   * 推送新反馈通知，失败只记日志不抛错
   * 调用方无需 await（也可以 await，本方法不会 reject）
   * @param payload 反馈摘要
   */
  async notify(payload: FeedbackNotifyPayload): Promise<void> {
    const ch = await this.channel()
    if (!ch.url) return

    try {
      await this.post(ch, this.buildBody(ch.type, this.buildText(payload)))
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
  private buildBody(type: string, text: string): Record<string, unknown> {
    if (type === 'feishu') {
      return { msg_type: 'text', content: { text } }
    }
    return { msgtype: 'text', text: { content: text } }
  }

  /**
   * 发起 webhook 请求
   * 带超时：通知通道不可达时若不设上限，会一直占着连接。
   * 不跟随重定向：官方地址不会 3xx，跟随就可能被引到内网地址
   * 三家机器人地址写错 key 时仍回 HTTP 200，错误在响应体的 errcode/code 里，须一并判断
   * @param ch 推送通道
   * @param body 请求体
   */
  private async post(ch: Channel, body: Record<string, unknown>): Promise<void> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), FEEDBACK_NOTIFY.timeoutMs)
    try {
      const res = await fetch(ch.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
        redirect: 'error',
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json().catch(() => ({}))) as { errcode?: number; errmsg?: string; code?: number; msg?: string }
      const code = data.errcode ?? data.code ?? 0
      if (code !== 0) throw new Error(`机器人返回错误：${data.errmsg || data.msg || code}`)
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') throw new Error('推送超时，请检查服务器能否访问外网')
      throw err
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
