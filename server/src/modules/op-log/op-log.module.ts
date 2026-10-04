// 操作日志模块 —— 拦截器需被全局注册，故一并在此声明为 APP_INTERCEPTOR
import { Module } from '@nestjs/common'
import { APP_INTERCEPTOR } from '@nestjs/core'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AdminOpLog } from './op-log.entity'
import { OpLogService } from './op-log.service'
import { OpLogInterceptor } from './op-log.interceptor'
import { MgmtOpLogController } from './mgmt-op-log.controller'
import { AdminModule } from '../admin/admin.module'

@Module({
  // AdminModule 提供后台接口的守卫依赖
  imports: [TypeOrmModule.forFeature([AdminOpLog]), AdminModule],
  controllers: [MgmtOpLogController],
  providers: [
    OpLogService,
    // 全局注册：写操作分散在十余个控制器里，逐个挂拦截器必漏
    { provide: APP_INTERCEPTOR, useClass: OpLogInterceptor },
  ],
  exports: [OpLogService],
})
export class OpLogModule {}
