// 登录失败锁定 —— 唯一的暴力破解防线，本文件盯四件事：
// 1) 失败累加到阈值就锁 2) 锁定期内即便密码正确也拒
// 3) 成功登录清零计数与锁 4) 账号不存在与密码错误的对外提示完全一致（防账号枚举）
import { DataSource, type Repository } from 'typeorm'
import type { JwtService } from '@nestjs/jwt'
import { hash } from 'bcryptjs'
import { Member } from '../src/modules/member/member.entity'
import { MemberAuthService } from '../src/modules/member/member-auth.service'
import type { SmsCodeService } from '../src/modules/member/sms-code.service'
import type { CaptchaService } from '../src/modules/member/captcha.service'
import type { AuthConfigService } from '../src/modules/auth-config/auth-config.service'
import type { LoginLogService } from '../src/modules/login-log/login-log.service'
import { LOGIN_METHOD, MEMBER_STATUS } from '../src/common/enums'
import type { LoginDto } from '../src/modules/member/dto/member-auth.dto'

/** 与实体默认值一致的风控档位 */
const CFG = {
  allowPasswordLogin: true,
  allowSmsLogin: true,
  captchaThreshold: 3,
  lockThreshold: 5,
  lockMinutes: 15,
}

const PHONE = '13800138000'
const RIGHT_PWD = 'correct-password'
const CTX = { ip: '127.0.0.1', userAgent: 'jest' }

let ds: DataSource
let repo: Repository<Member>
let service: MemberAuthService
/** 图形验证码校验结果，按用例改写；null 表示通过 */
let captchaError: string | null

beforeAll(async () => {
  ds = new DataSource({
    type: 'better-sqlite3',
    database: ':memory:',
    entities: [Member],
    synchronize: true,
    logging: false,
  })
  await ds.initialize()
  repo = ds.getRepository(Member)
})

afterAll(async () => {
  await ds.destroy()
})

beforeEach(async () => {
  await repo.clear()
  captchaError = null

  const jwt = { signAsync: jest.fn().mockResolvedValue('signed-token') } as unknown as JwtService
  const smsCode = { verify: jest.fn().mockReturnValue(null) } as unknown as SmsCodeService
  // verify 返回错误字符串表示不通过，返回 null 表示通过
  const captcha = { verify: jest.fn(() => captchaError) } as unknown as CaptchaService
  const authConfig = { get: jest.fn().mockResolvedValue(CFG) } as unknown as AuthConfigService
  const loginLog = { write: jest.fn().mockResolvedValue(undefined) } as unknown as LoginLogService

  service = new MemberAuthService(repo, jwt, smsCode, captcha, authConfig, loginLog)
})

/** 造一个可登录的会员 */
async function seedMember(over: Partial<Member> = {}): Promise<Member> {
  return repo.save(
    repo.create({
      phone: PHONE,
      nickname: '测试会员',
      passwordHash: await hash(RIGHT_PWD, 10),
      status: MEMBER_STATUS.NORMAL,
      failedAttempts: 0,
      lockedUntil: null,
      ...over,
    }),
  )
}

/** 发起一次密码登录 */
function login(password: string): ReturnType<MemberAuthService['login']> {
  const dto: LoginDto = { phone: PHONE, method: LOGIN_METHOD.PASSWORD, password }
  return service.login(dto, CTX)
}

describe('失败次数累加与锁定', () => {
  it('前 4 次失败只累加，不锁定', async () => {
    await seedMember()
    for (let i = 1; i <= 4; i++) {
      const res = await login('wrong')
      expect(res.ok).toBe(false)
      const row = await repo.findOneByOrFail({ phone: PHONE })
      expect(row.failedAttempts).toBe(i)
      expect(row.lockedUntil).toBeNull()
    }
  })

  it('第 5 次失败触发锁定，并把计数清零', async () => {
    await seedMember({ failedAttempts: 4 })
    // 已达 captchaThreshold，需带验证码；这里让验证码通过，考察的是密码错误后的锁定
    await login('wrong')

    const row = await repo.findOneByOrFail({ phone: PHONE })
    expect(row.lockedUntil).not.toBeNull()
    // 计数清零，避免解锁后一次失败又立刻锁上
    expect(row.failedAttempts).toBe(0)
  })

  it('锁定时长按配置的分钟数计算', async () => {
    await seedMember({ failedAttempts: 4 })
    const before = Date.now()
    await login('wrong')

    const row = await repo.findOneByOrFail({ phone: PHONE })
    const lockedMs = (row.lockedUntil as Date).getTime() - before
    // 15 分钟 ±5 秒的执行抖动
    expect(lockedMs).toBeGreaterThan(CFG.lockMinutes * 60 * 1000 - 5000)
    expect(lockedMs).toBeLessThan(CFG.lockMinutes * 60 * 1000 + 5000)
  })
})

describe('锁定期内的行为', () => {
  it('锁定期内密码正确也被拒', async () => {
    await seedMember({ lockedUntil: new Date(Date.now() + 10 * 60 * 1000) })

    const res = await login(RIGHT_PWD)
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.message).toContain('锁定')
  })

  it('锁定提示给出剩余分钟数', async () => {
    await seedMember({ lockedUntil: new Date(Date.now() + 10 * 60 * 1000) })
    const res = await login(RIGHT_PWD)
    if (!res.ok) expect(res.message).toMatch(/请 \d+ 分钟后再试/)
  })

  it('锁定已过期时放行，不需要手工解锁', async () => {
    await seedMember({ lockedUntil: new Date(Date.now() - 1000) })
    const res = await login(RIGHT_PWD)
    expect(res.ok).toBe(true)
  })
})

describe('登录成功后的状态复位', () => {
  it('成功后失败计数清零、锁定清空', async () => {
    await seedMember({ failedAttempts: 2 })
    // failedAttempts=2 未达 captchaThreshold(3)，无需验证码
    const res = await login(RIGHT_PWD)
    expect(res.ok).toBe(true)

    const row = await repo.findOneByOrFail({ phone: PHONE })
    expect(row.failedAttempts).toBe(0)
    expect(row.lockedUntil).toBeNull()
    expect(row.lastLoginAt).not.toBeNull()
  })
})

describe('达阈值后强制图形验证码', () => {
  it('失败数达 captchaThreshold 后，验证码错误即拒，且不校验密码', async () => {
    await seedMember({ failedAttempts: 3 })
    captchaError = '图形验证码错误'

    const res = await login(RIGHT_PWD)
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.message).toBe('图形验证码错误')
    // 验证码没过就不该动失败计数
    const row = await repo.findOneByOrFail({ phone: PHONE })
    expect(row.failedAttempts).toBe(3)
  })

  it('未达阈值时不要求验证码', async () => {
    await seedMember({ failedAttempts: 2 })
    captchaError = '不该被调用'

    const res = await login(RIGHT_PWD)
    expect(res.ok).toBe(true)
  })

  it('失败后回传 captchaRequired，告知前端下次要带验证码', async () => {
    await seedMember({ failedAttempts: 2 })
    const res = await login('wrong')
    expect(res.ok).toBe(false)
    // 累加到 3 已达阈值
    if (!res.ok) expect(res.captchaRequired).toBe(true)
  })

  it('已达阈值却未带验证码（刷新过登录页）时同样回传 captchaRequired，前台才能补出输入项', async () => {
    // 回归：此前这条分支不带标志，刷新后的会员只看到「请输入图形验证码」却没有输入框，再也登不上
    await seedMember({ failedAttempts: 3 })
    captchaError = '请输入图形验证码'

    const res = await login(RIGHT_PWD)
    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.message).toBe('请输入图形验证码')
      expect(res.captchaRequired).toBe(true)
    }
  })
})

describe('账号枚举防护', () => {
  it('账号不存在与密码错误的对外提示完全一致', async () => {
    await seedMember()
    const wrongPwd = await login('wrong')

    await repo.clear()
    const noAccount = await login('whatever')

    expect(wrongPwd.ok).toBe(false)
    expect(noAccount.ok).toBe(false)
    if (!wrongPwd.ok && !noAccount.ok) {
      expect(noAccount.message).toBe(wrongPwd.message)
    }
  })

  it('禁用账号有独立提示（这是管理动作，不算枚举泄露）', async () => {
    await seedMember({ status: MEMBER_STATUS.DISABLED })
    const res = await login(RIGHT_PWD)
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.message).toContain('禁用')
  })

  it('账号不存在时不写库、不产生残留记录', async () => {
    const res = await login('whatever')
    expect(res.ok).toBe(false)
    expect(await repo.count()).toBe(0)
  })
})
