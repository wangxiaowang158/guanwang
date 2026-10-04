// 内容表补发布状态列 —— 对应原 server/sql/2026-09-22-add-content-status.sql
//
// 默认值取 published：存量内容在加列前都是「填完即对外」的，
// 若默认成 draft，升级瞬间官网全站内容会从前台消失。
//
// 带 hasColumn 守卫的两个场景：
// 1. 全新库：基线迁移已按最新实体建表，列本就在，此处空转
// 2. 已手工跑过 sql/ 脚本的存量库：列已在，同样空转
import { TableColumn, TableIndex } from 'typeorm'
import type { MigrationInterface, QueryRunner } from 'typeorm'

/** 索引名与实体 @Index() 在 sqlite 下的自动命名无关，此处固定命名便于回滚时精确定位 */
const INDEX_NAME = 'IDX_content_status'

export class AddContentStatus1790000001000 implements MigrationInterface {
  name = 'AddContentStatus1790000001000'

  async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn('content', 'status'))) {
      await queryRunner.addColumn(
        'content',
        new TableColumn({
          name: 'status',
          type: 'varchar',
          length: '16',
          isNullable: false,
          default: "'published'",
          comment: '发布状态：draft 草稿 / published 已发布',
        }),
      )
    }

    // 前台查询按 channelKey + status 过滤，无索引会全表扫
    const table = await queryRunner.getTable('content')
    const hasIndex = table?.indices.some(i => i.columnNames.length === 1 && i.columnNames[0] === 'status')
    if (!hasIndex) {
      await queryRunner.createIndex(
        'content',
        new TableIndex({ name: INDEX_NAME, columnNames: ['status'] }),
      )
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('content')
    const index = table?.indices.find(i => i.name === INDEX_NAME)
    if (index) await queryRunner.dropIndex('content', index)
    if (await queryRunner.hasColumn('content', 'status')) {
      await queryRunner.dropColumn('content', 'status')
    }
  }
}
