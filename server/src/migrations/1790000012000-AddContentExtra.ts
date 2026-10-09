// 内容宽表增加 extra 扩展列 —— 承载多标签、业务线、行业、指标组、痛点方案等结构化信息
//
// 做法：content 表加可空 text 列，存量记录为 null，前台观感不变。
// 先查列是否已存在：全新库的 Baseline 走 synchronize，建出的就是最新结构，已含该列
import { TableColumn } from 'typeorm'
import type { MigrationInterface, QueryRunner } from 'typeorm'

export class AddContentExtra1790000012000 implements MigrationInterface {
  name = 'AddContentExtra1790000012000'

  async up(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasColumn('content', 'extra')) return
    await queryRunner.addColumn('content', new TableColumn({
      name: 'extra', type: 'text', isNullable: true, comment: '扩展数据（JSON 文本）',
    }))
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasColumn('content', 'extra')) await queryRunner.dropColumn('content', 'extra')
  }
}
