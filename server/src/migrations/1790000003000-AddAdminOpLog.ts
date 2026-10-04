// 管理端操作日志表 —— 对应原 server/sql/2026-09-22-add-admin-op-log.sql
//
// 操作人账号/姓名存快照而非外键：账号改名或被删后，日志仍须显示当时是谁操作的，
// 做外键反而会在删账号时连带删掉审计记录。
import { Table, TableIndex } from 'typeorm'
import type { MigrationInterface, QueryRunner } from 'typeorm'

/** 表名与索引名集中声明，up / down 共用，避免两处写串 */
const TABLE = 'admin_op_log'
const INDEXES: ReadonlyArray<{ name: string; column: string }> = [
  { name: 'IDX_admin_op_log_adminId', column: 'adminId' },
  { name: 'IDX_admin_op_log_module', column: 'module' },
  { name: 'IDX_admin_op_log_result', column: 'result' },
  { name: 'IDX_admin_op_log_createdAt', column: 'createdAt' },
]

export class AddAdminOpLog1790000003000 implements MigrationInterface {
  name = 'AddAdminOpLog1790000003000'

  async up(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable(TABLE)) return

    await queryRunner.createTable(
      new Table({
        name: TABLE,
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'adminId', type: 'int', isNullable: false, comment: '操作人 id' },
          { name: 'adminAccount', type: 'varchar', length: '50', isNullable: false, comment: '操作人账号快照' },
          { name: 'adminName', type: 'varchar', length: '50', isNullable: true, comment: '操作人姓名快照' },
          { name: 'action', type: 'varchar', length: '100', isNullable: false, comment: '操作说明' },
          { name: 'module', type: 'varchar', length: '50', isNullable: false, comment: '所属模块' },
          { name: 'method', type: 'varchar', length: '10', isNullable: false, comment: 'HTTP 方法' },
          { name: 'path', type: 'varchar', length: '200', isNullable: false, comment: '请求路径，不含查询串' },
          { name: 'params', type: 'text', isNullable: true, comment: '请求参数快照（已脱敏、超长截断）' },
          { name: 'ip', type: 'varchar', length: '64', isNullable: true, comment: '操作来源 IP' },
          { name: 'result', type: 'varchar', length: '20', isNullable: false, comment: '操作结果：success / failure' },
          { name: 'errorMessage', type: 'varchar', length: '300', isNullable: true, comment: '失败原因' },
          {
            name: 'createdAt',
            type: 'datetime',
            isNullable: false,
            default: 'CURRENT_TIMESTAMP',
            comment: '操作时间',
          },
        ],
      }),
      // 第二参数 createForeignKeys=false：本表刻意不做外键
      false,
    )

    for (const idx of INDEXES) {
      await queryRunner.createIndex(TABLE, new TableIndex({ name: idx.name, columnNames: [idx.column] }))
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable(TABLE)) await queryRunner.dropTable(TABLE)
  }
}
