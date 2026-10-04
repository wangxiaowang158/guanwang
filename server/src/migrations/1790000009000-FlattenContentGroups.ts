// 前台内容区块从 group 改为 list / single，并清掉其下无内容的孙栏目
//
// 背景：energy-contract / energy-other / smart-platform 在前台是栏目页的内容区块，
// banner-smart 是智慧能源页头图，内容都挂在它们自己名下。但它们被建成 group：
// 后台没有 group 的编辑页、侧边栏也不让点，这几块官网内容在后台无处可改。
// 而它们下面的孙栏目（energy-c-* / smart-p-* / banner-s-*）前台从来不读，填了也不显示。
//
// 只删「没有任何内容」的孙栏目：若运营已在里面录过内容，保留栏目，交给人工迁移，
// 不替运营丢数据。孙栏目保留时父级仍会显示为分组菜单——数据安全优先于界面整洁。
import type { MigrationInterface, QueryRunner } from 'typeorm'

/** 冻结副本：与 scripts/seed/flatten-groups.ts 此刻一致 */
const TO_LIST = ['energy-contract', 'energy-other', 'smart-platform']
const TO_SINGLE = ['banner-smart']
const FORM_FIELDS: Record<string, string> = {
  list: JSON.stringify(['title', 'description', 'content', 'cover', 'video', 'link', 'isTop']),
  single: JSON.stringify(['title', 'cover', 'link']),
}
const LIST_COLUMNS = JSON.stringify(['sort', 'title', 'createTime', 'isTop'])

export class FlattenContentGroups1790000009000 implements MigrationInterface {
  name = 'FlattenContentGroups1790000009000'

  async up(queryRunner: QueryRunner): Promise<void> {
    const targets = [
      ...TO_LIST.map(key => ({ key, type: 'list' })),
      ...TO_SINGLE.map(key => ({ key, type: 'single' })),
    ]
    for (const { key, type } of targets) {
      const rows: Array<{ id: number; type: string }> = await queryRunner.query(
        this.sql('SELECT id, type FROM channel WHERE "key" = ?', queryRunner),
        [key],
      )
      // 栏目不存在（新库尚未跑 seed）或已不是 group（运营已手工调整）时不动
      if (rows.length === 0 || rows[0].type !== 'group') continue
      const parentId = rows[0].id

      await this.dropEmptyChildren(queryRunner, parentId)
      await queryRunner.query(
        'UPDATE channel SET type = ?, formFields = ?, listColumns = ? WHERE id = ?',
        [type, FORM_FIELDS[type], LIST_COLUMNS, parentId],
      )
    }
  }

  /**
   * 删除父栏目下没有内容、也没有下级的子栏目
   * @param queryRunner 当前事务
   * @param parentId 父栏目 id
   */
  private async dropEmptyChildren(queryRunner: QueryRunner, parentId: number): Promise<void> {
    const children: Array<{ id: number; key: string }> = await queryRunner.query(
      this.sql('SELECT id, "key" FROM channel WHERE parentId = ?', queryRunner),
      [parentId],
    )
    for (const child of children) {
      const [{ n: contentCount }]: Array<{ n: number | string }> = await queryRunner.query(
        'SELECT COUNT(*) AS n FROM content WHERE channelKey = ?',
        [child.key],
      )
      const [{ n: childCount }]: Array<{ n: number | string }> = await queryRunner.query(
        'SELECT COUNT(*) AS n FROM channel WHERE parentId = ?',
        [child.id],
      )
      // COUNT 在 mysql 驱动下可能以字符串返回，统一转数字比较
      if (Number(contentCount) > 0 || Number(childCount) > 0) continue
      await queryRunner.query('DELETE FROM channel WHERE id = ?', [child.id])
    }
  }

  /** 不回滚：被删的孙栏目本就无内容，复原只会重新造出前台不读的空栏目 */
  async down(): Promise<void> {
    // 故意留空
  }

  /**
   * 按方言换 key 列的转义符（key 为 MySQL 保留字）
   * @param sql 以双引号转义 key 列的 SQL 模板
   * @param queryRunner 用于读取当前方言
   */
  private sql(sql: string, queryRunner: QueryRunner): string {
    if (queryRunner.connection.options.type === 'mysql') return sql.replace(/"key"/g, '`key`')
    return sql
  }
}
