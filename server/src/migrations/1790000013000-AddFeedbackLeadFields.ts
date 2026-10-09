// 反馈表增加线索字段 —— 官网「预约/咨询」入口收集线索类型、邮箱、职位
//
// 做法：feedback 表加三个可空列，存量记录为 null，原有留言与会员反馈不受影响。
// 逐列先查是否已存在：全新库的 Baseline 走 synchronize，建出的就是最新结构，已含这些列
import { TableColumn } from 'typeorm'
import type { MigrationInterface, QueryRunner } from 'typeorm'

const COLUMNS = [
  new TableColumn({ name: 'leadType', type: 'varchar', length: '20', isNullable: true, comment: '线索类型' }),
  new TableColumn({ name: 'email', type: 'varchar', length: '100', isNullable: true, comment: '联系邮箱' }),
  new TableColumn({ name: 'position', type: 'varchar', length: '50', isNullable: true, comment: '职位' }),
]

export class AddFeedbackLeadFields1790000013000 implements MigrationInterface {
  name = 'AddFeedbackLeadFields1790000013000'

  async up(queryRunner: QueryRunner): Promise<void> {
    for (const col of COLUMNS) {
      if (await queryRunner.hasColumn('feedback', col.name)) continue
      await queryRunner.addColumn('feedback', col)
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const col of COLUMNS) {
      if (await queryRunner.hasColumn('feedback', col.name)) await queryRunner.dropColumn('feedback', col.name)
    }
  }
}
