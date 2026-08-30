// 登录失败锁定与图形验证码阈值专项验证 —— 跑完退出（不常驻）
// 用法：npx ts-node src/scripts/smoke-lockout.ts
//
// 两个必须注意的实现约束：
// 1. app.config.ts 的常量在模块加载时求值，因此 DB 路径等环境变量必须在 import AppModule
//    之前设置好，AppModule 只能用动态 import 引入，否则改的是「已经读完的值」，不生效。
// 2. 登录接口限流写在 @Throttle 装饰器上（10 次/60 秒），无法从配置放宽。ThrottlerGuard
//    以 req.ip 计数，故此处开启 trust proxy 并为每个请求分配独立 X-Forwarded-For，
//    使每次请求落到不同计数桶。仅测试实例如此，不改动业务代码。
import 'reflect-metadata'
import { config } from 'dotenv'
import { ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { DataSource } from 'typeorm'
import type { NestExpressApplication } from '@nestjs/platform-express'

config()
// 强制使用独立数据文件与 sqlite，避免污染开发库
process.env.DB_TYPE = 'sqlite'
process.env.DB_SQLITE_PATH = 'data/smoke-lockout.sqlite'
process.env.DB_SYNCHRONIZE = 'true'

const PORT = 3998
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

/** 每次请求分配一个独立来源 IP，规避按 IP 的接口限流 */
function nextIp(): string {
  ipSeq += 1
  return `10.0.${Math.floor(ipSeq / 250)}.${(ipSeq % 250) + 1}`
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
  // 动态 import：确保上方环境变量先于 app.config.ts 的模块级求值生效
  const { AppModule } = await import('../app.module')
  const { TransformInterceptor } = await import('../common/interceptors/transform.interceptor')
  const { AllExceptionFilter } = await import('../common/filters/all-exception.filter')
  const { MGMT_DEV_TOKEN } = await import('../config/app.config')
  const { MGMT_DEV_TOKEN_HEADER } = await import('../common/guards/mgmt-dev.guard')
  const { SmsCodeService } = await import('../modules/member/sms-code.service')
  const { CaptchaService } = await import('../modules/member/captcha.service')

  const app = await NestFactory.create<NestExpressApplication>(AppModule, { logger: false })
  app.setGlobalPrefix('api')
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))
  app.useGlobalInterceptors(new TransformInterceptor())
  app.useGlobalFilters(new AllExceptionFilter())
  // 仅测试实例：使 req.ip 采信 X-Forwarded-For，从而让限流按请求分桶
  app.set('trust proxy', true)
  await app.listen(PORT)

  const MGMT_HEADERS = { [MGMT_DEV_TOKEN_HEADER]: MGMT_DEV_TOKEN }

  // 清空历史数据，保证可重复执行。
  // auth_config 是持久化单例，必须一并清除，否则会沿用上一轮残留阈值，
  // 导致断言实际依赖脏状态而非本轮设定。
  const ds = app.get(DataSource)
  await ds.query('DELETE FROM member_login_log')
  await ds.query('DELETE FROM member')
  await ds.query('DELETE FROM auth_config')

  const sms = app.get(SmsCodeService)
  const captcha = app.get(CaptchaService)
  const smsStore = (sms as any).store as Map<string, { code: string }>
  const captchaStore = (captcha as any).store as Map<string, { answer: string }>

  /** 直接取用服务内验证码，绕过短信通道 */
  function issueSmsCode(phone: string, purpose: 'register' | 'login' | 'reset'): string {
    smsStore.delete(`${purpose}:${phone}`)
    const err = sms.send(phone, purpose)
    if (err) throw new Error(`发码失败：${err}`)
    return smsStore.get(`${purpose}:${phone}`)!.code
  }

  /** 取一组可通过校验的图形验证码，模拟用户正确识图 */
  async function issueCaptcha(): Promise<{ captchaId: string; captcha: string }> {
    const res = await call('GET', '/portal/auth/captcha')
    return { captchaId: res.data.captchaId, captcha: captchaStore.get(res.data.captchaId)!.answer }
  }

  /** 设定阈值并断言写入成功，避免测试静默依赖旧配置 */
  async function setThresholds(captchaThreshold: number, lockThreshold: number): Promise<void> {
    const res = await call(
      'PUT', '/mgmt/auth-config',
      { captchaThreshold, lockThreshold, lockMinutes: 10 },
      MGMT_HEADERS,
    )
    check(`配置生效：验证码阈值 ${captchaThreshold} / 锁定阈值 ${lockThreshold}`, res.code === 200, res)
  }

  const phone = '13611136000'
  // 先只压低验证码阈值，锁定阈值取 DTO 允许的上限 20（@Max(20)，不能更大）：
  // 否则验证一次性验证码时会先触发锁定，后续断言全部被锁定分支短路。
  await setThresholds(2, 20)

  const reg = await call('POST', '/portal/auth/register', {
    phone, nickname: '锁定测试', password: 'Passw0rd123', smsCode: issueSmsCode(phone, 'register'),
  })
  check('前置：注册成功', reg.code === 200, reg)

  console.info('\n【图形验证码阈值 = 2】')
  const f1 = await call('POST', '/portal/auth/login', { phone, method: 'password', password: 'Wrong1234' })
  check('第 1 次失败：不要求验证码', f1.code === 401 && f1.data?.captchaRequired === false, f1)

  const f2 = await call('POST', '/portal/auth/login', { phone, method: 'password', password: 'Wrong1234' })
  check('第 2 次失败：开始要求验证码', f2.code === 401 && f2.data?.captchaRequired === true, f2)

  const noCaptcha = await call('POST', '/portal/auth/login', { phone, method: 'password', password: 'Passw0rd123' })
  check('达阈值后：密码正确但缺验证码仍被拒', noCaptcha.code === 401, noCaptcha)
  check('提示要求输入图形验证码', noCaptcha.message.includes('图形验证码'), noCaptcha.message)

  const fake = await call('POST', '/portal/auth/login', {
    phone, method: 'password', password: 'Passw0rd123', captchaId: 'not-exist', captcha: '12',
  })
  check('伪造验证码标识被拒（不可绕过）', fake.code === 401, fake)

  console.info('\n【同一验证码不可重复使用】')
  // 此刻失败次数仍在阈值之上，验证码会真正进入校验分支并被消费
  const reuse = await issueCaptcha()
  const consumed = await call('POST', '/portal/auth/login', {
    phone, method: 'password', password: 'Wrong1234', ...reuse,
  })
  check('前置：带有效验证码但密码错误', consumed.code === 401, consumed)
  const reused = await call('POST', '/portal/auth/login', {
    phone, method: 'password', password: 'Passw0rd123', ...reuse,
  })
  check('已消费的验证码再次提交被拒', reused.code === 401, reused)
  check('提示验证码已失效', reused.message.includes('失效'), reused.message)

  console.info('\n【验证码 + 密码均正确 → 放行】')
  const okLogin = await call('POST', '/portal/auth/login', {
    phone, method: 'password', password: 'Passw0rd123', ...(await issueCaptcha()),
  })
  const loginOk = okLogin.code === 200 && typeof okLogin.data?.token === 'string'
  check('验证码正确后登录成功', loginOk, okLogin)
  // 绑定 loginOk，避免 401 响应下这两条空洞通过
  check('登录成功响应不含密码哈希', loginOk && !JSON.stringify(okLogin.data).includes('passwordHash'), okLogin.data)
  check('登录成功后不再要求验证码（计数已归零）', loginOk && okLogin.data?.captchaRequired === false, okLogin.data)

  console.info('\n【锁定阈值 = 3】')
  await setThresholds(2, 3)
  // 每次都附带有效验证码，确保失败原因是密码而非验证码
  for (let i = 1; i <= 3; i += 1) {
    await call('POST', '/portal/auth/login', {
      phone, method: 'password', password: 'Wrong1234', ...(await issueCaptcha()),
    })
  }
  const locked = await call('POST', '/portal/auth/login', {
    phone, method: 'password', password: 'Passw0rd123', ...(await issueCaptcha()),
  })
  check('连续失败达阈值后账号被锁定', locked.code === 401 && locked.message.includes('锁定'), locked)
  check('锁定提示不泄露密码是否正确', !locked.message.includes('密码错误'), locked.message)

  console.info('\n【管理端置为正常可解锁】')
  const list = await call('GET', '/mgmt/member/list', undefined, MGMT_HEADERS)
  const memberId = list.data.list[0].id
  // 列表 VO 只给 phoneMasked，刻意不含原始 phone 字段
  check('管理端列表手机号已遮蔽', list.data.list[0].phoneMasked?.includes('****'), list.data.list[0])
  check('管理端列表不含原始手机号', list.data.list[0].phone === undefined, list.data.list[0])

  await call('PUT', `/mgmt/member/status/${memberId}`, { status: 'normal' }, MGMT_HEADERS)
  const unlocked = await call('POST', '/portal/auth/login', { phone, method: 'password', password: 'Passw0rd123' })
  check('解锁后立即可登录且失败计数已清零', unlocked.code === 200, unlocked)

  console.info('\n【重置密码】')
  const reset = await call('POST', '/portal/auth/reset-password', {
    phone, smsCode: issueSmsCode(phone, 'reset'), newPassword: 'NewPass456',
  })
  check('重置密码成功', reset.code === 200, reset)

  const oldPwd = await call('POST', '/portal/auth/login', { phone, method: 'password', password: 'Passw0rd123' })
  check('旧密码已失效', oldPwd.code === 401, oldPwd)

  const newPwd = await call('POST', '/portal/auth/login', { phone, method: 'password', password: 'NewPass456' })
  check('新密码可正常登录', newPwd.code === 200, newPwd)

  const ghostPhone = '13500135000'
  const ghost = await call('POST', '/portal/auth/reset-password', {
    phone: ghostPhone, smsCode: issueSmsCode(ghostPhone, 'reset'), newPassword: 'NewPass456',
  })
  check('未注册号码重置返回成功（防账号枚举）', ghost.code === 200, ghost)

  console.info('\n【登录日志留痕】')
  const logs = await call('GET', '/mgmt/login-log/list', undefined, MGMT_HEADERS)
  check('失败与成功记录均已留痕', logs.code === 200 && logs.data.total >= 8, logs.data?.total)

  await app.close()

  console.info(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.info(`锁定机制验证：通过 ${passed}，失败 ${failed}`)
  console.info(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  if (failed > 0) process.exit(1)
}

main().catch((err) => {
  console.error('验证异常：', err)
  process.exit(1)
})
