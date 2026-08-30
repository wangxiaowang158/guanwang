// 统一响应包装 —— 把 service 返回值包成前端约定的 { code, message, data }
// 前端 admin/web 的接口层已按 code:200 表成功解析，此处保持一致，避免前端改造
import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common'
import { Observable, map } from 'rxjs'

/** 前端约定的统一响应结构 */
export interface ApiResult<T = unknown> {
  code: number
  message: string
  data: T
}

/** 业务侧可返回此结构自定义 message，拦截器原样透出 */
export interface RawResult<T = unknown> {
  __raw: true
  code: number
  message: string
  data: T
}

/** 构造自定义响应，供 service 返回 */
export function raw<T>(data: T, message = 'success', code = 200): RawResult<T> {
  return { __raw: true, code, message, data }
}

/** 判断是否为业务自定义响应 */
function isRaw(value: unknown): value is RawResult {
  return typeof value === 'object' && value !== null && (value as RawResult).__raw === true
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResult<unknown>> {
  intercept(_context: ExecutionContext, next: CallHandler<T>): Observable<ApiResult<unknown>> {
    return next.handle().pipe(
      map((value) => {
        if (isRaw(value)) {
          return { code: value.code, message: value.message, data: value.data }
        }
        return { code: 200, message: 'success', data: value ?? null }
      }),
    )
  }
}
