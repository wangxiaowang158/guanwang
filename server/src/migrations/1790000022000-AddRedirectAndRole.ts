// 跳转规则表 + 管理员角色
//
// redirect_rule：旧地址 → 新地址（301/302），网关对页面请求先查一次
// admin_role：可复用的菜单权限组；admin.roleId 指向它，最终权限为角色 ∪ 账号自身
// 存量账号 roleId 为 null，权限与升级前完全一致
// 先查是否已存在：全新库的 Baseline 走 synchronize，建出的就是最新结构
import { Table, TableColumn } from 'typeorm'
import type { MigrationInterface, QueryRunner } from 'typeorm'

export class AddRedirectAndRole1790000022000 implements MigrationInterface {
  name = 'AddRedirectAndRole1790000022000'

  async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable('redirect_rule'))) {
      await queryRunner.createTable(new Table({
        name: 'redirect_rule',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'fromPath', type: 'varchar', length: '300', comment: '旧地址（规整后）' },
          { name: 'toUrl', type: 'varchar', length: '500', comment: '新地址' },
          { name: 'statusCode', type: 'smallint', default: 301, comment: '301 / 302' },
          { name: 'enabled', type: 'boolean', default: true, comment: '是否启用' },
          { name: 'remark', type: 'varchar', length: '100', default: "''", comment: '备注' },
          { name: 'hits', type: 'int', default: 0, comment: '命中次数' },
          { name: 'lastHitAt', type: 'datetime', isNullable: true, comment: '最近命中时间' },
          { name: 'createdAt', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
          { name: 'updatedAt', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
        ],
        indices: [{ name: 'IDX_redirect_from', columnNames: ['fromPath'], isUnique: true }],
      }))
    }
    if (!(await queryRunner.hasTable('admin_role'))) {
      await queryRunner.createTable(new Table({
        name: 'admin_role',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'name', type: 'varchar', length: '50', comment: '角色名' },
          { name: 'perms', type: 'varchar', length: '1000', default: "'[]'", comment: '菜单权限 JSON' },
          { name: 'remark', type: 'varchar', length: '200', default: "''", comment: '说明' },
          { name: 'createdAt', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
          { name: 'updatedAt', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
        ],
        indices: [{ name: 'IDX_admin_role_name', columnNames: ['name'], isUnique: true }],
      }))
    }
    if (!(await queryRunner.hasColumn('admin', 'roleId'))) {
      await queryRunner.addColumn('admin', new TableColumn({ name: 'roleId', type: 'int', isNullable: true, comment: '所属角色' }))
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasColumn('admin', 'roleId')) await queryRunner.dropColumn('admin', 'roleId')
    if (await queryRunner.hasTable('admin_role')) await queryRunner.dropTable('admin_role')
    if (await queryRunner.hasTable('redirect_rule')) await queryRunner.dropTable('redirect_rule')
  }
}
