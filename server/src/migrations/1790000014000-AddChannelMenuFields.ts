// 栏目增加超级下拉菜单字段 —— 分组名与说明，由后台维护
//
// 做法：channel 表加两个可空列，存量栏目为 null，菜单仍按单列展示，观感不变。
// 逐列先查是否已存在：全新库的 Baseline 走 synchronize，建出的就是最新结构，已含这些列
import { TableColumn } from 'typeorm'
import type { MigrationInterface, QueryRunner } from 'typeorm'

const COLUMNS = [
  new TableColumn({ name: 'menuParent', type: 'varchar', length: '64', isNullable: true, comment: '菜单挂靠的顶级栏目 key' }),
  new TableColumn({ name: 'menuGroup', type: 'varchar', length: '50', isNullable: true, comment: '菜单分组名' }),
  new TableColumn({ name: 'menuDesc', type: 'varchar', length: '100', isNullable: true, comment: '菜单说明' }),
]

export class AddChannelMenuFields1790000014000 implements MigrationInterface {
  name = 'AddChannelMenuFields1790000014000'

  async up(queryRunner: QueryRunner): Promise<void> {
    for (const col of COLUMNS) {
      if (await queryRunner.hasColumn('channel', col.name)) continue
      await queryRunner.addColumn('channel', col)
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const col of COLUMNS) {
      if (await queryRunner.hasColumn('channel', col.name)) await queryRunner.dropColumn('channel', col.name)
    }
  }
}
