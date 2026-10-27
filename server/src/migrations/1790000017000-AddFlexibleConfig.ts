// 后台灵活配置 —— 首页布局、页脚配置、区块外观
//
// site_config：homeLayout（首页板块顺序/显隐/标题/底色）、footerConfig（页脚分栏/友情链接/社交账号），JSON 文本
// channel：blockTone / blockBg / blockColumns / headingAlign（区块底色、背景图、每行列数、标题对齐）
// 全部可空，存量数据为 null：前台按现行默认渲染，观感不变。
// 逐列先查是否已存在：全新库的 Baseline 走 synchronize，建出的就是最新结构
import { TableColumn } from 'typeorm'
import type { MigrationInterface, QueryRunner } from 'typeorm'

const COLUMNS: Array<[string, TableColumn]> = [
  ['site_config', new TableColumn({ name: 'homeLayout', type: 'text', isNullable: true, comment: '首页布局 JSON' })],
  ['site_config', new TableColumn({ name: 'footerConfig', type: 'text', isNullable: true, comment: '页脚配置 JSON' })],
  ['channel', new TableColumn({ name: 'blockTone', type: 'varchar', length: '16', isNullable: true, comment: '区块底色' })],
  ['channel', new TableColumn({ name: 'blockBg', type: 'varchar', length: '500', isNullable: true, comment: '区块背景图' })],
  ['channel', new TableColumn({ name: 'blockColumns', type: 'tinyint', isNullable: true, comment: '区块每行列数' })],
  ['channel', new TableColumn({ name: 'headingAlign', type: 'varchar', length: '8', isNullable: true, comment: '区块标题对齐' })],
]

export class AddFlexibleConfig1790000017000 implements MigrationInterface {
  name = 'AddFlexibleConfig1790000017000'

  async up(queryRunner: QueryRunner): Promise<void> {
    for (const [table, col] of COLUMNS) {
      if (await queryRunner.hasColumn(table, col.name)) continue
      await queryRunner.addColumn(table, col)
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const [table, col] of [...COLUMNS].reverse()) {
      if (await queryRunner.hasColumn(table, col.name)) await queryRunner.dropColumn(table, col.name)
    }
  }
}
