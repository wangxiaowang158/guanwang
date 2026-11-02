// 操作日志的改前改后对比 —— 只看请求参数看不出原来是什么、哪些字段真被改了
// 可空：存量日志与新增类操作没有对比，前端为空时不显示对比区
// 先查是否已存在：全新库的 Baseline 走 synchronize，建出的就是最新结构
import { TableColumn } from 'typeorm'
import type { MigrationInterface, QueryRunner } from 'typeorm'

const COLUMN = new TableColumn({ name: 'changes', type: 'text', isNullable: true, comment: '改前改后对比 JSON' })

export class AddOpLogChanges1790000024000 implements MigrationInterface {
  name = 'AddOpLogChanges1790000024000'

  async up(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasColumn('admin_op_log', COLUMN.name)) return
    await queryRunner.addColumn('admin_op_log', COLUMN)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasColumn('admin_op_log', COLUMN.name)) await queryRunner.dropColumn('admin_op_log', COLUMN.name)
  }
}
