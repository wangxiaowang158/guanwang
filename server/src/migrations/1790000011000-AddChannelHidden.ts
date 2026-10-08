// 栏目增加「隐藏」开关 —— 运营可隐藏不想展示的一级模块
//
// 做法：channel 表加 hidden 列，默认 false（全部可见），存量栏目观感不变。
// 先查列是否已存在：全新库的 Baseline 走 synchronize，建出的就是最新结构，已含该列
import { TableColumn } from 'typeorm'
import type { MigrationInterface, QueryRunner } from 'typeorm'

export class AddChannelHidden1790000011000 implements MigrationInterface {
  name = 'AddChannelHidden1790000011000'

  async up(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasColumn('channel', 'hidden')) return
    await queryRunner.addColumn('channel', new TableColumn({
      name: 'hidden', type: 'boolean', isNullable: false, default: false, comment: '是否隐藏（仅顶级栏目有效）',
    }))
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasColumn('channel', 'hidden')) await queryRunner.dropColumn('channel', 'hidden')
  }
}
