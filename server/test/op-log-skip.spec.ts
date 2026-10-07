// 操作日志排除项 —— SRS 3.5.18：后台登录与退出登录不记入操作日志
// 退出接口为吊销令牌挂了 AdminGuard，请求上带着操作人，须由拦截器显式排除
import type { CallHandler, ExecutionContext } from '@nestjs/common'
import { lastValueFrom, of } from 'rxjs'
import { OpLogInterceptor } from '../src/modules/op-log/op-log.interceptor'
import type { OpLogService } from '../src/modules/op-log/op-log.service'

/** 构造带管理员身份的写请求上下文 */
function ctxOf(method: string, path: string): ExecutionContext {
  const req = {
    method,
    path,
    ip: '127.0.0.1',
    body: {},
    query: {},
    admin: { id: 1, account: 'admin', name: '管理员', isSuper: true, perms: [] },
  }
  return {
    getType: () => 'http',
    switchToHttp: () => ({ getRequest: () => req, getResponse: () => ({}) }),
  } as unknown as ExecutionContext
}

const next: CallHandler = { handle: () => of({ code: 200, message: 'ok', data: null }) }

describe('OpLogInterceptor 排除项', () => {
  it('退出登录不写操作日志', async () => {
    const write = jest.fn().mockResolvedValue(undefined)
    const interceptor = new OpLogInterceptor({ write } as unknown as OpLogService)
    await lastValueFrom(interceptor.intercept(ctxOf('POST', '/api/mgmt/auth/logout'), next))
    expect(write).not.toHaveBeenCalled()
  })

  it('带尾斜杠的退出请求同样不记录', async () => {
    const write = jest.fn().mockResolvedValue(undefined)
    const interceptor = new OpLogInterceptor({ write } as unknown as OpLogService)
    await lastValueFrom(interceptor.intercept(ctxOf('POST', '/api/mgmt/auth/logout/'), next))
    expect(write).not.toHaveBeenCalled()
  })

  it('其他后台写操作照常记录', async () => {
    const write = jest.fn().mockResolvedValue(undefined)
    const interceptor = new OpLogInterceptor({ write } as unknown as OpLogService)
    await lastValueFrom(interceptor.intercept(ctxOf('PUT', '/api/mgmt/auth/password'), next))
    expect(write).toHaveBeenCalledTimes(1)
  })
})
