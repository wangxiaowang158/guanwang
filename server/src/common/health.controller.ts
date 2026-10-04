// 健康检查 —— 验证服务与数据库连通性
import { Controller, Get, HttpStatus, Logger, Res } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import type { Response } from 'express'
import { raw } from './interceptors/transform.interceptor'

@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name)

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /**
   * 服务与数据库存活检查
   * 数据库不通时返回 HTTP 503：全局异常过滤器恒回 200，容器健康检查只看 HTTP 状态，
   * 若抛异常交给过滤器，库挂了健康检查也照样通过。故此处自行控制状态码
   */
  @Get()
  async check(@Res({ passthrough: true }) res: Response) {
    try {
      // 执行一次最轻量查询确认连接可用，而非仅看 isInitialized 标志
      await this.dataSource.query('SELECT 1')
    } catch (err) {
      this.logger.error('健康检查：数据库不可用', err instanceof Error ? err.message : String(err))
      res.status(HttpStatus.SERVICE_UNAVAILABLE)
      // 响应体 code 与 HTTP 状态保持一致，按 code 判成败的调用方也能识别
      return raw({ status: 'down' }, '数据库不可用', HttpStatus.SERVICE_UNAVAILABLE)
    }
    return {
      status: 'ok',
      database: this.dataSource.options.type,
      tables: this.dataSource.entityMetadatas.map((m) => m.tableName),
    }
  }
}
