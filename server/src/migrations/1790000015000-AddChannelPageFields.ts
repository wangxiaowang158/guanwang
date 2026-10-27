// 栏目增加页面级字段 —— 头图背景图 / 背景视频、导航外链
//
// 做法：channel 表加三个可空列，存量栏目为 null：头图仍回落 banner-<key> 的封面，导航观感不变。
// 逐列先查是否已存在：全新库的 Baseline 走 synchronize，建出的就是最新结构，已含这些列
import { TableColumn } from 'typeorm'
import type { MigrationInterface, QueryRunner } from 'typeorm'

const COLUMNS = [
  new TableColumn({ name: 'heroBg', type: 'varchar', length: '500', isNullable: true, comment: '页面头图背景图' }),
  new TableColumn({ name: 'heroVideo', type: 'varchar', length: '500', isNullable: true, comment: '页面头图背景视频' }),
  new TableColumn({ name: 'externalUrl', type: 'varchar', length: '500', isNullable: true, comment: '导航外链地址' }),
]

export class AddChannelPageFields1790000015000 implements MigrationInterface {
  name = 'AddChannelPageFields1790000015000'

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
