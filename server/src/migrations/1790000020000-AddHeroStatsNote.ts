// 首屏业绩数据条的口径说明 —— 「数据截至 xx，来源 xx」
//
// 背景：首屏只摆数字、不注明时间与来源，客户难以判断可信度；参考站都会标注统计口径。
// 默认空串：为空时前台不显示这一行，存量站点观感不变。
// 先查是否已存在：全新库的 Baseline 走 synchronize，建出的就是最新结构
import { TableColumn } from 'typeorm'
import type { MigrationInterface, QueryRunner } from 'typeorm'

const COLUMN = new TableColumn({ name: 'heroStatsNote', type: 'varchar', length: '60', default: "''", comment: '首屏数据口径说明' })

export class AddHeroStatsNote1790000020000 implements MigrationInterface {
  name = 'AddHeroStatsNote1790000020000'

  async up(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasColumn('site_config', COLUMN.name)) return
    await queryRunner.addColumn('site_config', COLUMN)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasColumn('site_config', COLUMN.name)) await queryRunner.dropColumn('site_config', COLUMN.name)
  }
}
