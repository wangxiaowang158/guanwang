// 健康检查 —— 验证服务与数据库连通性
import { Controller, Get } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'

@Controller('health')
export class HealthController {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /** 服务与数据库存活检查 */
  @Get()
  async check() {
    // 执行一次最轻量查询确认连接可用，而非仅看 isInitialized 标志
    await this.dataSource.query('SELECT 1')
    return {
      status: 'ok',
      database: this.dataSource.options.type,
      tables: this.dataSource.entityMetadatas.map((m) => m.tableName),
    }
  }
}
