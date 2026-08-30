// 反馈模块冒烟测试 —— 跑完退出（不常驻）
// 用法：npx ts-node src/scripts/smoke-feedback.ts
//
// 沿用 smoke-lockout.ts 的两条约束（详见该文件头部注释）：
// 1. 环境变量必须在 import AppModule 之前设置，AppModule 只能动态 import
// 2. 测试实例开启 trust proxy + 每请求独立 X-Forwarded-For，规避按 IP 限流
import 'reflect-metadata'
import { config } from 'dotenv'
import { ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { DataSource } from 'typeorm'
import type { NestExpressApplication } from '@nestjs/platform-express'

config()
process.env.DB_TYPE = 'sqlite'
process.env.DB_SQLITE_PATH = 'data/smoke-feedback.sqlite'
process.env.DB_SYNCHRONIZE = 'true'

const PORT = 3997
const BASE = `http://127.0.0.1:${PORT}/api`

let passed = 0
let failed = 0
let ipSeq = 0

/** 断言并记录结果 */
function check(name: string, condition: boolean, detail?: unknown): void {
  if (condition) {
    passed += 1
    console.info(`  ✅ ${name}`)
  } else {
    failed += 1
    console.error(`  ❌ ${name}`, detail !== undefined ? JSON.stringify(detail) : '')
  }
}

/** 日期边界回归用的时间点：本地凌晨 03:30，其 UTC 值落在前一天（东八区） */
const DAWN = new Date('2026-07-15T03:30:00')

/**
 * 把 Date 转成 TypeORM 在 SQLite 中的存储格式（UTC 朴素字符串）。
 * better-sqlite3 的绑定参数不接受 Date 对象，必须自行转换。
 */
function toSqliteUtc(d: Date): string {
  return d.toISOString().replace('T', ' ').replace('Z', '')
}

/** 每次请求分配独立来源 IP，规避按 IP 的接口限流 */
function nextIp(): string {
  ipSeq += 1
  return `10.1.${Math.floor(ipSeq / 250)}.${(ipSeq % 250) + 1}`
}

/** 发请求并解析统一响应体 */
async function call(
  method: string,
  path: string,
  body?: unknown,
  headers: Record<string, string> = {},
): Promise<{ code: number; message: string; data: any }> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': nextIp(), ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  return (await res.json()) as { code: number; message: string; data: any }
}

async function main(): Promise<void> {
  const { AppModule } = await import('../app.module')
  const { TransformInterceptor } = await import('../common/interceptors/transform.interceptor')
  const { AllExceptionFilter } = await import('../common/filters/all-exception.filter')
  const { MGMT_DEV_TOKEN } = await import('../config/app.config')
  const { MGMT_DEV_TOKEN_HEADER } = await import('../common/guards/mgmt-dev.guard')
  const { SmsCodeService } = await import('../modules/member/sms-code.service')

  const app = await NestFactory.create<NestExpressApplication>(AppModule, { logger: false })
  app.setGlobalPrefix('api')
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))
  app.useGlobalInterceptors(new TransformInterceptor())
  app.useGlobalFilters(new AllExceptionFilter())
  app.set('trust proxy', true)
  await app.listen(PORT)

  const MGMT = { [MGMT_DEV_TOKEN_HEADER]: MGMT_DEV_TOKEN }

  const ds = app.get(DataSource)
  await ds.query('DELETE FROM feedback_reply')
  await ds.query('DELETE FROM feedback')
  await ds.query('DELETE FROM member_login_log')
  await ds.query('DELETE FROM member')
  await ds.query('DELETE FROM auth_config')

  const sms = app.get(SmsCodeService)
  const smsStore = (sms as any).store as Map<string, { code: string }>

  /** 注册一个会员并返回其令牌 */
  async function registerMember(phone: string, nickname: string): Promise<string> {
    smsStore.delete(`register:${phone}`)
    sms.send(phone, 'register')
    const code = smsStore.get(`register:${phone}`)!.code
    const res = await call('POST', '/portal/auth/register', {
      phone, nickname, password: 'Passw0rd123', smsCode: code,
    })
    if (res.code !== 200) throw new Error(`注册失败：${res.message}`)
    return res.data.token
  }

  console.info('\n【匿名提交路径】')
  const anon = await call('POST', '/portal/feedback/anonymous', {
    company: '测试单位', name: '张三', phone: '13800001111',
    feedbackType: 'cooperation', content: '咨询综合能源服务方案', sourcePage: '联系我们',
  })
  check('匿名提交成功（免登录）', anon.code === 200 && typeof anon.data?.id === 'number', anon)

  const badPhone = await call('POST', '/portal/feedback/anonymous', {
    name: '李四', phone: '123', content: '手机号格式非法',
  })
  check('非法手机号被拒', badPhone.code === 400, badPhone)

  const emptyContent = await call('POST', '/portal/feedback/anonymous', {
    name: '李四', phone: '13800002222', content: '',
  })
  check('空内容被拒', emptyContent.code === 400, emptyContent)

  const tooLong = await call('POST', '/portal/feedback/anonymous', {
    name: '李四', phone: '13800002222', content: 'x'.repeat(2001),
  })
  check('超长内容被拒（上限 2000 字）', tooLong.code === 400, tooLong)

  const badType = await call('POST', '/portal/feedback/anonymous', {
    name: '李四', phone: '13800002222', feedbackType: 'notExist', content: '非法类型',
  })
  check('非法反馈类型被拒', badType.code === 400, badType)

  console.info('\n【会员提交路径】')
  const token = await registerMember('13600006000', '会员甲')
  const AUTH = { Authorization: `Bearer ${token}` }

  const noAuth = await call('POST', '/portal/feedback/submit', { content: '未带令牌' })
  check('会员提交接口拒绝无令牌请求', noAuth.code === 401, noAuth)

  const mine = await call('POST', '/portal/feedback/submit', {
    feedbackType: 'suggestion', content: '希望增加移动端适配', sourcePage: '个人中心',
  }, AUTH)
  check('会员提交成功', mine.code === 200 && typeof mine.data?.id === 'number', mine)
  const memberFeedbackId = mine.data.id

  const mineList = await call('GET', '/portal/feedback/mine', undefined, AUTH)
  check('会员可查看自己的反馈', mineList.code === 200 && mineList.data.length === 1, mineList)
  check('会员反馈初始状态为待处理', mineList.data[0]?.status === 'pending', mineList.data[0])
  check('尚无回复时回复列表为空', mineList.data[0]?.replies?.length === 0, mineList.data[0])

  // 另注册一个会员，确认只能看到自己的反馈
  const token2 = await registerMember('13600006001', '会员乙')
  const otherList = await call('GET', '/portal/feedback/mine', undefined, { Authorization: `Bearer ${token2}` })
  check('会员之间反馈相互隔离', otherList.code === 200 && otherList.data.length === 0, otherList)

  console.info('\n【后台查询与筛选】')
  const noToken = await call('GET', '/mgmt/feedback/list')
  check('管理端列表拒绝无令牌请求', noToken.code === 401, noToken)

  const memberTokenToMgmt = await call('GET', '/mgmt/feedback/list', undefined, AUTH)
  check('会员令牌无法访问管理端反馈接口（隔离红线）', memberTokenToMgmt.code === 401, memberTokenToMgmt)

  const list = await call('GET', '/mgmt/feedback/list', undefined, MGMT)
  check('管理端可读列表', list.code === 200 && list.data.total === 2, list.data?.total)
  check('列表手机号已遮蔽', list.data.list.every((i: any) => i.phoneMasked?.includes('****')), list.data.list)
  check('列表不含原始手机号', list.data.list.every((i: any) => i.phone === undefined), list.data.list)
  check('列表不含提交 IP（运维字段不出列表）', list.data.list.every((i: any) => i.submitIp === undefined), list.data.list)

  const byAnon = await call('GET', '/mgmt/feedback/list?source=anonymous', undefined, MGMT)
  check('按来源筛选：匿名 1 条', byAnon.data.total === 1, byAnon.data)

  const byMember = await call('GET', '/mgmt/feedback/list?source=member', undefined, MGMT)
  check('按来源筛选：会员 1 条', byMember.data.total === 1, byMember.data)

  const byKeyword = await call('GET', '/mgmt/feedback/list?keyword=移动端', undefined, MGMT)
  check('关键词可匹配内容', byKeyword.data.total === 1, byKeyword.data)

  const byStatus = await call('GET', '/mgmt/feedback/list?status=closed', undefined, MGMT)
  check('按状态筛选：无已关闭记录', byStatus.data.total === 0, byStatus.data)

  const badDate = await call('GET', '/mgmt/feedback/list?startDate=2026/01/01', undefined, MGMT)
  check('非法日期格式被拒', badDate.code === 400, badDate)

  // 日期边界回归：createdAt 以 UTC 存储，本地凌晨提交的记录其 UTC 值落在前一天。
  // 曾因拼本地日期字符串比较而漏查，此处用本地 03:30 的记录钉住该缺陷。
  await ds.query(
    `INSERT INTO feedback (source, memberId, company, name, phone, feedbackType, content, status, submitIp, sourcePage, createdAt, updatedAt)
     VALUES ('anonymous', NULL, NULL, '凌晨提交者', '13800002222', 'other', '凌晨时段提交的反馈', 'pending', NULL, NULL, ?, ?)`,
    [toSqliteUtc(DAWN), toSqliteUtc(DAWN)],
  )
  const dawnHit = await call(
    'GET', '/mgmt/feedback/list?startDate=2026-07-15&endDate=2026-07-15', undefined, MGMT,
  )
  check(
    '凌晨提交的记录按当天日期可查到（UTC 边界不漏查）',
    dawnHit.data.total === 1 && dawnHit.data.list[0].name === '凌晨提交者',
    dawnHit.data,
  )
  const dawnMissPrev = await call(
    'GET', '/mgmt/feedback/list?startDate=2026-07-14&endDate=2026-07-14', undefined, MGMT,
  )
  check('凌晨提交的记录不会被前一天筛选误命中', dawnMissPrev.data.total === 0, dawnMissPrev.data)

  const onlyStart = await call('GET', '/mgmt/feedback/list?startDate=2026-07-16', undefined, MGMT)
  check('只传起始日期也生效（排除更早的凌晨记录）', onlyStart.data.total === 2, onlyStart.data)

  const onlyEnd = await call('GET', '/mgmt/feedback/list?endDate=2026-07-15', undefined, MGMT)
  check('只传结束日期也生效（仅命中凌晨记录）', onlyEnd.data.total === 1, onlyEnd.data)

  await ds.query("DELETE FROM feedback WHERE name = '凌晨提交者'")

  const detail = await call('GET', `/mgmt/feedback/detail/${memberFeedbackId}`, undefined, MGMT)
  check('详情可读且含完整手机号', detail.code === 200 && detail.data.phone === '13600006000', detail.data)
  check('详情含会员昵称', detail.data.memberNickname === '会员甲', detail.data)

  const notFound = await call('GET', '/mgmt/feedback/detail/999999', undefined, MGMT)
  check('不存在的反馈返回 404', notFound.code === 404, notFound)

  console.info('\n【回复与可见性】')
  const anonId = byAnon.data.list[0].id
  const replyAnon = await call('POST', `/mgmt/feedback/reply/${anonId}`, {
    content: '已收到，我们会尽快联系您', repliedBy: 'admin',
  }, MGMT)
  check('回复匿名反馈成功', replyAnon.code === 200, replyAnon)

  const anonDetail = await call('GET', `/mgmt/feedback/detail/${anonId}`, undefined, MGMT)
  check('匿名反馈的回复默认不对会员可见', anonDetail.data.replies[0]?.visibleToMember === false, anonDetail.data.replies[0])
  check('回复后状态自动推进为已回复', anonDetail.data.status === 'replied', anonDetail.data.status)

  const replyMember = await call('POST', `/mgmt/feedback/reply/${memberFeedbackId}`, {
    content: '感谢建议，已列入排期', repliedBy: 'admin',
  }, MGMT)
  check('回复会员反馈成功', replyMember.code === 200, replyMember)

  const mineAfter = await call('GET', '/portal/feedback/mine', undefined, AUTH)
  check('会员反馈的回复对会员可见', mineAfter.data[0]?.replies?.length === 1, mineAfter.data[0])
  check('会员侧可见回复内容正确', mineAfter.data[0]?.replies[0]?.content === '感谢建议，已列入排期', mineAfter.data[0]?.replies[0])
  check('会员侧状态同步为已回复', mineAfter.data[0]?.status === 'replied', mineAfter.data[0]?.status)

  // 显式指定不可见，用于内部留痕
  await call('POST', `/mgmt/feedback/reply/${memberFeedbackId}`, {
    content: '内部备注：已转技术部', visibleToMember: false,
  }, MGMT)
  const mineAfter2 = await call('GET', '/portal/feedback/mine', undefined, AUTH)
  check('标记为不可见的回复不推送给会员', mineAfter2.data[0]?.replies?.length === 1, mineAfter2.data[0]?.replies)

  const detailAfter2 = await call('GET', `/mgmt/feedback/detail/${memberFeedbackId}`, undefined, MGMT)
  check('后台可见全部回复（含内部留痕）', detailAfter2.data.replies.length === 2, detailAfter2.data.replies)

  const emptyReply = await call('POST', `/mgmt/feedback/reply/${memberFeedbackId}`, { content: '' }, MGMT)
  check('空回复被拒', emptyReply.code === 400, emptyReply)

  console.info('\n【状态流转约束】')
  // 当前为 replied，白名单只允许 → closed
  const backward = await call('PUT', `/mgmt/feedback/status/${memberFeedbackId}`, { status: 'pending' }, MGMT)
  check('已回复不可回退为待处理', backward.code === 400, backward)

  const toProcessing = await call('PUT', `/mgmt/feedback/status/${memberFeedbackId}`, { status: 'processing' }, MGMT)
  check('已回复不可回退为处理中', toProcessing.code === 400, toProcessing)

  const badStatus = await call('PUT', `/mgmt/feedback/status/${memberFeedbackId}`, { status: 'notExist' }, MGMT)
  check('非法状态值被拒', badStatus.code === 400, badStatus)

  const toClosed = await call('PUT', `/mgmt/feedback/status/${memberFeedbackId}`, { status: 'closed' }, MGMT)
  check('已回复可关闭', toClosed.code === 200, toClosed)

  const reopenClosed = await call('PUT', `/mgmt/feedback/status/${memberFeedbackId}`, { status: 'processing' }, MGMT)
  check('已关闭为终态，不可再流转', reopenClosed.code === 400, reopenClosed)

  const replyClosed = await call('POST', `/mgmt/feedback/reply/${memberFeedbackId}`, { content: '追加回复' }, MGMT)
  check('已关闭的反馈不能再回复', replyClosed.code === 400, replyClosed)

  const sameStatus = await call('PUT', `/mgmt/feedback/status/${anonId}`, { status: 'replied' }, MGMT)
  check('设置为当前相同状态视为幂等成功', sameStatus.code === 200, sameStatus)

  console.info('\n【删除】')
  const badIds = await call('DELETE', '/mgmt/feedback/batch?ids=abc', undefined, MGMT)
  check('非法 ids 参数被拒', badIds.code === 400, badIds)

  const delOne = await call('DELETE', `/mgmt/feedback/delete/${memberFeedbackId}`, undefined, MGMT)
  check('删除单条成功', delOne.code === 200, delOne)

  const replyGone = await ds.query('SELECT COUNT(*) AS c FROM feedback_reply WHERE feedbackId = ?', [memberFeedbackId])
  check('删除反馈时连带清除其回复', Number(replyGone[0].c) === 0, replyGone)

  const delAgain = await call('DELETE', `/mgmt/feedback/delete/${memberFeedbackId}`, undefined, MGMT)
  check('重复删除返回 404', delAgain.code === 404, delAgain)

  const delBatch = await call('DELETE', `/mgmt/feedback/batch?ids=${anonId}`, undefined, MGMT)
  check('批量删除成功', delBatch.code === 200 && delBatch.data?.removed === 1, delBatch)

  const finalList = await call('GET', '/mgmt/feedback/list', undefined, MGMT)
  check('删除后列表为空', finalList.data.total === 0, finalList.data)

  console.info('\n【种子数据可写入】')
  const { Feedback } = await import('../modules/feedback/feedback.entity')
  const repo = ds.getRepository(Feedback)
  await repo.save(repo.create({
    source: 'anonymous', memberId: null, company: '汇佳科技', name: '成女士',
    phone: '13205469688', feedbackType: 'other', content: '希望获取技术资料',
    status: 'pending', submitIp: '112.224.163.44', sourcePage: '首页',
    createdAt: new Date('2025/07/23 02:27:30'),
  }))
  const seeded = await call('GET', '/mgmt/feedback/list', undefined, MGMT)
  check('历史留言样例可作为匿名反馈读取', seeded.data.total === 1 && seeded.data.list[0].source === 'anonymous', seeded.data)

  await app.close()

  console.info(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.info(`反馈模块冒烟：通过 ${passed}，失败 ${failed}`)
  console.info(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  if (failed > 0) process.exit(1)
}

main().catch((err) => {
  console.error('验证异常：', err)
  process.exit(1)
})
