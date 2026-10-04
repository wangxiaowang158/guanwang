// 管理员表补「密码最后变更时间」列 —— 对应原 server/sql/2026-09-22-add-admin-pwd-changed-at.sql
//
// 默认值取 0：签发 token 时载荷写入当时的 pwdChangedAt，守卫比对
// 「载荷值 != 库里值」才判为失效。存量 token 没有该字段，守卫按 0 处理，
// 与列默认值 0 相等，因此升级瞬间不会把所有人踢下线。
import { TableColumn } from 'typeorm'
import type { MigrationInterface, QueryRunner } from 'typeorm'

export class AddAdminPwdChangedAt1790000002000 implements MigrationInterface {
  name = 'AddAdminPwdChangedAt1790000002000'

  async up(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasColumn('admin', 'pwdChangedAt')) return

    await queryRunner.addColumn(
      'admin',
      new TableColumn({
        name: 'pwdChangedAt',
        type: 'bigint',
        isNullable: false,
        default: 0,
        comment: '密码最后变更时间（Unix 秒），改密后旧 token 失效依据',
      }),
    )
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasColumn('admin', 'pwdChangedAt')) {
      await queryRunner.dropColumn('admin', 'pwdChangedAt')
    }
  }
}
