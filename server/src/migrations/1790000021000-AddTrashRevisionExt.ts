// 内容回收站 + 历史版本 + 站点扩展配置
//
// content.deletedAt：软删除标记，非空即在回收站；存量数据为 null，全部视为未删除
// content_revision：每次保存前的旧值快照，每条内容保留最近 20 版
// site_config.extConfig：统计与站长验证、灰色模式、悬浮条、图片水印（JSON），null 为默认
// 先查是否已存在：全新库的 Baseline 走 synchronize，建出的就是最新结构
import { Table, TableColumn, TableIndex } from 'typeorm'
import type { MigrationInterface, QueryRunner } from 'typeorm'

const REVISION = 'content_revision'

export class AddTrashRevisionExt1790000021000 implements MigrationInterface {
  name = 'AddTrashRevisionExt1790000021000'

  async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn('content', 'deletedAt'))) {
      await queryRunner.addColumn('content', new TableColumn({
        name: 'deletedAt', type: 'datetime', isNullable: true, comment: '删除时间（回收站）',
      }))
      await queryRunner.createIndex('content', new TableIndex({ name: 'IDX_content_deletedAt', columnNames: ['deletedAt'] }))
    }
    if (!(await queryRunner.hasColumn('site_config', 'extConfig'))) {
      await queryRunner.addColumn('site_config', new TableColumn({
        name: 'extConfig', type: 'text', isNullable: true, comment: '扩展配置 JSON',
      }))
    }
    if (!(await queryRunner.hasTable(REVISION))) {
      await queryRunner.createTable(new Table({
        name: REVISION,
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'contentId', type: 'int', comment: '所属内容 id' },
          { name: 'channelKey', type: 'varchar', length: '64', comment: '所属栏目 key' },
          { name: 'title', type: 'varchar', length: '300', default: "''", comment: '快照时的标题' },
          { name: 'snapshot', type: 'text', comment: '字段快照 JSON' },
          { name: 'operator', type: 'varchar', length: '64', default: "''", comment: '操作人' },
          { name: 'createdAt', type: 'datetime', default: 'CURRENT_TIMESTAMP', comment: '快照时间' },
        ],
        indices: [
          { name: 'IDX_revision_content', columnNames: ['contentId', 'id'] },
          { name: 'IDX_revision_channel', columnNames: ['channelKey'] },
        ],
      }))
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable(REVISION)) await queryRunner.dropTable(REVISION)
    if (await queryRunner.hasColumn('site_config', 'extConfig')) await queryRunner.dropColumn('site_config', 'extConfig')
    if (await queryRunner.hasColumn('content', 'deletedAt')) {
      // 按列找索引而非按名：全新库走 synchronize 建的索引是 TypeORM 自动名，不叫 IDX_content_deletedAt
      const table = await queryRunner.getTable('content')
      const idx = table?.indices.find(i => i.columnNames.length === 1 && i.columnNames[0] === 'deletedAt')
      if (idx) await queryRunner.dropIndex('content', idx)
      await queryRunner.dropColumn('content', 'deletedAt')
    }
  }
}
