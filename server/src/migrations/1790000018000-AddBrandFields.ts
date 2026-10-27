// 品牌信息可配 —— 公司全称/简称/英文名、站点图标、默认分享图
//
// 背景：这些原先写死在前台 web/src/config/brand.ts 与 index.html，换主体或换图标要改代码重新发版。
// 全部默认空串：前台为空时回落到原内置值，存量站点观感不变。
// 逐列先查是否已存在：全新库的 Baseline 走 synchronize，建出的就是最新结构
import { TableColumn } from 'typeorm'
import type { MigrationInterface, QueryRunner } from 'typeorm'

const COLUMNS: TableColumn[] = [
  new TableColumn({ name: 'companyName', type: 'varchar', length: '100', default: "''", comment: '公司全称' }),
  new TableColumn({ name: 'companyShort', type: 'varchar', length: '30', default: "''", comment: '公司简称' }),
  new TableColumn({ name: 'companyEn', type: 'varchar', length: '50', default: "''", comment: '公司英文名' }),
  new TableColumn({ name: 'favicon', type: 'varchar', length: '500', default: "''", comment: '站点图标' }),
  new TableColumn({ name: 'shareImage', type: 'varchar', length: '500', default: "''", comment: '默认分享图' }),
]

export class AddBrandFields1790000018000 implements MigrationInterface {
  name = 'AddBrandFields1790000018000'

  async up(queryRunner: QueryRunner): Promise<void> {
    for (const col of COLUMNS) {
      if (await queryRunner.hasColumn('site_config', col.name)) continue
      await queryRunner.addColumn('site_config', col)
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const col of [...COLUMNS].reverse()) {
      if (await queryRunner.hasColumn('site_config', col.name)) await queryRunner.dropColumn('site_config', col.name)
    }
  }
}
