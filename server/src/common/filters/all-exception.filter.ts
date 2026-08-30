// 全局异常过滤 —— 异常也包成统一响应结构，HTTP 状态码恒为 200
// 前端按响应体 code 判成败，不依赖 HTTP 状态码；避免 axios 走 reject 分支
import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common'
import type { Response } from 'express'

@Catch()
export class AllExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionFilter.name)

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()

    let code = HttpStatus.INTERNAL_SERVER_ERROR
    let message = '服务异常，请稍后重试'

    if (exception instanceof HttpException) {
      code = exception.getStatus()
      message = this.extractMessage(exception)
    } else {
      // 非预期异常记录完整堆栈供排查，但不向客户端暴露内部细节
      this.logger.error('未处理异常', exception instanceof Error ? exception.stack : String(exception))
    }

    response.status(HttpStatus.OK).json({ code, message, data: null })
  }

  /** 提取异常消息：校验管道返回数组时取首条，避免把整个数组抛给前端 */
  private extractMessage(exception: HttpException): string {
    const res = exception.getResponse()
    if (typeof res === 'string') return res
    if (typeof res === 'object' && res !== null) {
      const msg = (res as { message?: string | string[] }).message
      if (Array.isArray(msg)) return msg[0] ?? exception.message
      if (typeof msg === 'string') return msg
    }
    return exception.message
  }
}
