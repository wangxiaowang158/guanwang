// 反馈导出服务 —— 按当前筛选条件导出 xlsx
// 列口径与后台列表完全一致（SRS 3.5.10）：手机号隐去中间四位，提交 IP 不参与导出
import { Injectable } from '@nestjs/common'
import ExcelJS from 'exceljs'
import { FEEDBACK_SOURCE, FEEDBACK_STATUS, FEEDBACK_TYPE } from '../../common/enums'
import type { FeedbackSource, FeedbackStatus, FeedbackType } from '../../common/enums'
import { maskPhone } from '../member/vo/member.vo'
import type { Feedback } from './feedback.entity'

/** 来源枚举 → 列表展示文案 */
const SOURCE_TEXT: Record<FeedbackSource, string> = {
  [FEEDBACK_SOURCE.ANONYMOUS]: '匿名',
  [FEEDBACK_SOURCE.MEMBER]: '会员',
}

/** 状态枚举 → 列表展示文案 */
const STATUS_TEXT: Record<FeedbackStatus, string> = {
  [FEEDBACK_STATUS.PENDING]: '待处理',
  [FEEDBACK_STATUS.PROCESSING]: '处理中',
  [FEEDBACK_STATUS.REPLIED]: '已回复',
  [FEEDBACK_STATUS.CLOSED]: '已关闭',
}

/** 分类枚举 → 列表展示文案；无值时列表显示「其他」 */
const TYPE_TEXT: Record<FeedbackType, string> = {
  [FEEDBACK_TYPE.SUGGESTION]: '建议',
  [FEEDBACK_TYPE.COMPLAINT]: '投诉',
  [FEEDBACK_TYPE.COOPERATION]: '合作',
  [FEEDBACK_TYPE.OTHER]: '其他',
}

/** 列定义，顺序与列表列一致 */
const COLUMNS: { header: string; width: number }[] = [
  { header: '单位', width: 28 },
  { header: '留言人', width: 14 },
  { header: '手机号', width: 16 },
  { header: '来源', width: 10 },
  { header: '反馈分类', width: 12 },
  { header: '反馈内容', width: 60 },
  { header: '处理状态', width: 12 },
  { header: '提交时间', width: 22 },
]

@Injectable()
export class FeedbackExportService {
  /**
   * 生成 xlsx 文件内容
   * @param items 已按筛选条件取好的反馈记录
   */
  async build(items: Feedback[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook()
    workbook.creator = '中瑞恒官网管理后台'
    workbook.created = new Date()
    const sheet = workbook.addWorksheet('意见反馈')

    sheet.columns = COLUMNS.map(c => ({ header: c.header, width: c.width }))
    const head = sheet.getRow(1)
    head.font = { bold: true }
    head.alignment = { vertical: 'middle' }

    for (const f of items) {
      sheet.addRow([
        f.company || '-',
        f.name,
        f.phone ? maskPhone(f.phone) : '-',
        SOURCE_TEXT[f.source] ?? f.source,
        f.feedbackType ? TYPE_TEXT[f.feedbackType] ?? '其他' : '其他',
        f.content,
        STATUS_TEXT[f.status] ?? f.status,
        this.formatTime(f.createdAt),
      ])
    }

    // 反馈内容较长，整列改为顶部对齐并自动换行，避免导出后单元格挤成一行
    sheet.getColumn(6).alignment = { wrapText: true, vertical: 'top' }

    const buffer = await workbook.xlsx.writeBuffer()
    return Buffer.from(buffer)
  }

  /** 导出文件名，带时间戳避免多次导出互相覆盖 */
  buildFileName(now = new Date()): string {
    const p = (n: number) => String(n).padStart(2, '0')
    const stamp = `${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}`
      + `${p(now.getHours())}${p(now.getMinutes())}${p(now.getSeconds())}`
    return `意见反馈-${stamp}.xlsx`
  }

  /** 时间格式与列表展示一致 */
  private formatTime(d: Date): string {
    const p = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} `
      + `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
  }
}
