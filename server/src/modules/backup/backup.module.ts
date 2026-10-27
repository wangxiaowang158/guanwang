// 数据备份模块
import { Module } from '@nestjs/common'
import { AdminModule } from '../admin/admin.module'
import { OpLogModule } from '../op-log/op-log.module'
import { MgmtBackupController } from './backup.controller'

@Module({
  imports: [AdminModule, OpLogModule],
  controllers: [MgmtBackupController],
})
export class BackupModule {}
