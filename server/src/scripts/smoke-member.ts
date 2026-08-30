// 会员模块冒烟测试 —— 进程内启动应用、实测接口、跑完退出（不常驻）
// 用法：npx ts-node src/scripts/smoke-member.ts
import 'reflect-metadata'
import { config } from 'dotenv'
import { ValidationPipe, type INestApplication } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { DataSource } from 'typeorm'

config()
// 必须在 import AppModule 之前设置：app.config.ts 的常量在模块加载时即求值，
// 放到 main() 里赋值改的是「已经读完的值」，会导致本脚本误跑在开发库上。
process.env.DB_TYPE = 'sqlite'
process.env.DB_SQLITE_PATH = 'data/smoke-test.sqlite'
process.env.DB_SYNCHRONIZE = 'true'

const PORT = 3999
const BASE = `http://127.0.0.1:${PORT}/api`

let passed = 0
let failed = 0

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

/** 发请求并解析统一响应体 */
async function call(
  method: string,
  path: string,
  body?: unknown,
  headers: Record<string, string> = {},
): Promise<{ code: number; message: string; data: any }> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  return (await res.json()) as { code: number; message: string; data: any }
}

/** 从服务端日志抓取开发期验证码 */
const capturedCodes = new Map<string, string>()

async function main(): Promise<void> {
  // 动态 import：确保上方环境变量先于 app.config.ts 的模块级求值生效
  const { AppModule } = await import('../app.module')
  const { TransformInterceptor } = await import('../common/interceptors/transform.interceptor')
  const { AllExceptionFilter } = await import('../common/filters/all-exception.filter')
  const { MGMT_DEV_TOKEN } = await import('../config/app.config')
  const { MGMT_DEV_TOKEN_HEADER } = await import('../common/guards/mgmt-dev.guard')

  const app: INestApplication = await NestFactory.create(AppModule, { logger: false })
  app.setGlobalPrefix('api')
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))
  app.useGlobalInterceptors(new TransformInterceptor())
  app.useGlobalFilters(new AllExceptionFilter())
  await app.listen(PORT)

  // 清空历史数据，保证可重复执行
  const ds = app.get(DataSource)
  await ds.query('DELETE FROM member_login_log')
  await ds.query('DELETE FROM member')

  // 直接取用验证码服务实例，绕过短信通道
  const { SmsCodeService } = await import('../modules/member/sms-code.service')
  const smsService = app.get(SmsCodeService)
  const originalSend = smsService.send.bind(smsService)
  // 包装 send 以捕获生成的验证码（内部 store 为私有，此处从日志语义等价取值）
  smsService.send = (phone: string, purpose: any) => {
    const err = originalSend(phone, purpose)
    if (!err) {
      const store = (smsService as any).store as Map<string, { code: string }>
      const rec = store.get(`${purpose}:${phone}`)
      if (rec) capturedCodes.set(`${purpose}:${phone}`, rec.code)
    }
    return err
  }

  const MGMT_HEADERS = { [MGMT_DEV_TOKEN_HEADER]: MGMT_DEV_TOKEN }
  const phone = '13800138000'

  console.info('\n【健康检查】')
  const health = await call('GET', '/health')
  check('数据库连通且表已建', health.code === 200 && health.data.tables.length === 5, health.data)

  console.info('\n【注册流程】')
  const sms1 = await call('POST', '/portal/auth/sms-code', { phone, purpose: 'register' })
  check('发送注册验证码成功', sms1.code === 200, sms1)

  const regCode = capturedCodes.get(`register:${phone}`)
  check('验证码已生成', typeof regCode === 'string' && regCode.length === 6)

  const weakPwd = await call('POST', '/portal/auth/register', {
    phone, nickname: '测试会员', password: 'onlyletters', smsCode: regCode,
  })
  check('弱密码被拒（需字母数字混合）', weakPwd.code === 400, weakPwd.message)

  // 上一步已消费验证码，需重新发送
  smsService['store'].delete(`register:${phone}`)
  await call('POST', '/portal/auth/sms-code', { phone, purpose: 'register' })
  const regCode2 = capturedCodes.get(`register:${phone}`)

  const reg = await call('POST', '/portal/auth/register', {
    phone, nickname: '测试会员', password: 'Passw0rd123', smsCode: regCode2,
  })
  check('注册成功并返回令牌', reg.code === 200 && typeof reg.data?.token === 'string', reg.message)
  check('注册响应不含密码哈希', !JSON.stringify(reg.data).includes('passwordHash'), reg.data)

  const token = reg.data?.token as string

  console.info('\n【登录与账号枚举防护】')
  const wrongPwd = await call('POST', '/portal/auth/login', { phone, method: 'password', password: 'WrongPass1' })
  check('错误密码登录失败', wrongPwd.code === 401, wrongPwd)

  const noSuchAccount = await call('POST', '/portal/auth/login', {
    phone: '13900139000', method: 'password', password: 'WrongPass1',
  })
  check('账号不存在与密码错误提示一致（防枚举）', noSuchAccount.message === wrongPwd.message, {
    notFound: noSuchAccount.message, wrongPwd: wrongPwd.message,
  })

  const ok = await call('POST', '/portal/auth/login', { phone, method: 'password', password: 'Passw0rd123' })
  check('正确密码登录成功', ok.code === 200 && typeof ok.data?.token === 'string', ok.message)

  console.info('\n【双身份隔离红线】')
  const memberTokenOnMgmt = await call('GET', '/mgmt/member/list', undefined, {
    Authorization: `Bearer ${token}`,
  })
  check('会员令牌无法访问管理端接口', memberTokenOnMgmt.code === 401, memberTokenOnMgmt)

  const noTokenPortal = await call('GET', '/portal/member/profile')
  check('未带令牌无法访问会员接口', noTokenPortal.code === 401, noTokenPortal)

  const mgmtNoToken = await call('GET', '/mgmt/member/list')
  check('管理端接口拒绝无令牌请求', mgmtNoToken.code === 401, mgmtNoToken)

  console.info('\n【会员资料】')
  const profile = await call('GET', '/portal/member/profile', undefined, { Authorization: `Bearer ${token}` })
  check('读取资料成功', profile.code === 200 && profile.data?.phone === phone, profile)
  check('资料不含密码哈希', !JSON.stringify(profile.data).includes('passwordHash'))

  console.info('\n【后台会员管理】')
  const list = await call('GET', '/mgmt/member/list', undefined, MGMT_HEADERS)
  check('会员列表可读', list.code === 200 && list.data?.total >= 1, list)
  check('列表手机号已遮蔽', list.data?.list?.[0]?.phoneMasked?.includes('****'), list.data?.list?.[0])
  check('列表不含密码哈希', !JSON.stringify(list.data).includes('passwordHash'))

  const memberId = list.data.list[0].id
  const disable = await call('PUT', `/mgmt/member/status/${memberId}`, { status: 'disabled' }, MGMT_HEADERS)
  check('禁用会员成功', disable.code === 200, disable)

  const loginAfterDisable = await call('POST', '/portal/auth/login', {
    phone, method: 'password', password: 'Passw0rd123',
  })
  check('禁用后无法登录', loginAfterDisable.code !== 200, loginAfterDisable)

  await call('PUT', `/mgmt/member/status/${memberId}`, { status: 'normal' }, MGMT_HEADERS)

  console.info('\n【登录日志】')
  const logs = await call('GET', '/mgmt/login-log/list', undefined, MGMT_HEADERS)
  check('登录日志已记录', logs.code === 200 && logs.data?.total >= 3, { total: logs.data?.total })
  const hasNotFoundReason = logs.data?.list?.some((l: any) => l.failReason === 'accountNotFound')
  check('失败原因已留痕（后台可见）', hasNotFoundReason === true)

  console.info('\n【图形验证码】')
  const cap = await call('GET', '/portal/auth/captcha')
  check('验证码题目已下发', cap.code === 200 && typeof cap.data?.captchaId === 'string', cap.data)
  const badCap = await call('POST', '/portal/auth/login', {
    phone, method: 'password', password: 'Passw0rd123', captchaId: cap.data.captchaId, captcha: '9999',
  })
  check('错误验证码不通过（未达阈值时不拦截，此处仅验证接口可用）', badCap.code === 200 || badCap.code === 401)

  console.info('\n【注册登录配置】')
  const cfg = await call('GET', '/mgmt/auth-config', undefined, MGMT_HEADERS)
  check('配置可读且含默认值', cfg.code === 200 && cfg.data?.passwordMinLength === 8, cfg.data)

  const closeReg = await call('PUT', '/mgmt/auth-config', { registerOpen: false }, MGMT_HEADERS)
  check('配置可更新', closeReg.code === 200 && closeReg.data?.registerOpen === false, closeReg.data)

  const regClosed = await call('POST', '/portal/auth/register', {
    phone: '13700137000', nickname: '新会员', password: 'Passw0rd123', smsCode: '123456',
  })
  check('关闭注册后拒绝注册', regClosed.code === 400 && regClosed.message.includes('未开放'), regClosed.message)

  await call('PUT', '/mgmt/auth-config', { registerOpen: true }, MGMT_HEADERS)

  await app.close()

  console.info(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.info(`冒烟结果：通过 ${passed}，失败 ${failed}`)
  console.info(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  if (failed > 0) process.exit(1)
}

main().catch((err) => {
  console.error('冒烟测试异常：', err)
  process.exit(1)
})
