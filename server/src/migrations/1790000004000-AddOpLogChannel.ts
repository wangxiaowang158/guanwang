// 操作日志栏目行 —— 对应原 server/sql/2026-09-22-add-oplog-channel.sql
//
// 与 src/modules/cms/seed/channels.json 中 id=1061 的记录保持一致。
// 该栏目仅供管理端使用，portalPath 留空 → 不进前台菜单。
//
// 不用 MySQL 的 ON DUPLICATE KEY UPDATE：那是方言专属语法，sqlite 下跑不通。
// 改为「先查再写」，顺带获得幂等性。
import type { MigrationInterface, QueryRunner } from 'typeorm'

/** 栏目 key 是程序语义标识，各部署一致；id 可能因初始化顺序不同而错位，故按 key 定位 */
const CHANNEL_KEY = 'op-log'

export class AddOpLogChannel1790000004000 implements MigrationInterface {
  name = 'AddOpLogChannel1790000004000'

  async up(queryRunner: QueryRunner): Promise<void> {
    const existing: Array<{ id: number }> = await queryRunner.query(
      this.sql('SELECT id FROM channel WHERE "key" = ?', queryRunner),
      [CHANNEL_KEY],
    )

    if (existing.length > 0) {
      // 已存在：只校正程序语义字段。name 是用户可在后台改的显示名，不覆盖
      await queryRunner.query(
        this.sql('UPDATE channel SET type = ?, icon = ? WHERE "key" = ?', queryRunner),
        ['oplog', 'FileSearchOutlined', CHANNEL_KEY],
      )
      return
    }

    await queryRunner.query(
      this.sql(
        'INSERT INTO channel (id, parentId, "key", name, type, icon, sort, formFields, listColumns) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        queryRunner,
      ),
      [1061, null, CHANNEL_KEY, '操作日志', 'oplog', 'FileSearchOutlined', 14, '[]',
        '["sort","title","createTime","isTop"]'],
    )
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(this.sql('DELETE FROM channel WHERE "key" = ?', queryRunner), [CHANNEL_KEY])
  }

  /**
   * 按方言换 key 列的转义符
   * key 是 MySQL 保留字，必须转义；两种方言的转义符不同（反引号 / 双引号）
   * @param sql 以双引号转义 key 列的 SQL 模板
   * @param queryRunner 用于读取当前方言
   */
  private sql(sql: string, queryRunner: QueryRunner): string {
    if (queryRunner.connection.options.type === 'mysql') return sql.replace(/"key"/g, '`key`')
    return sql
  }
}
