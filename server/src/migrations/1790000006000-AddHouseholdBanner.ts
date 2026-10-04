// 智能家居 Banner 栏目行 —— 前台 /household 页头图的后台维护入口
//
// 背景：前台页面头图取 `banner-<页面 key>` 栏目下的内容（见 PortalCmsService.bannerImage），
// 而 banner 父栏目下一直缺 banner-household，智能家居页的头图在后台无处可配。
// 与 src/modules/cms/seed/channels.json 中 key=banner-household 的记录保持一致。
//
// 不写死 id：seed 里的 1062 只是新库的参考编号，存量库的自增值早已越过它，
// 显式写 id 可能撞上运营后来新建的栏目。按 key 定位即可，与 seed 脚本口径一致
import type { MigrationInterface, QueryRunner } from 'typeorm'

const CHANNEL_KEY = 'banner-household'
const PARENT_KEY = 'banner'

/** 与 seed 中其它 Banner 单页栏目相同的字段配置 */
const FORM_FIELDS = JSON.stringify([
  'title', 'keywords', 'description', 'link', 'cover', 'updateTime', 'author', 'source', 'isTop',
])
const LIST_COLUMNS = JSON.stringify(['sort', 'title', 'createTime', 'isTop'])

/** 在 banner 父栏目下的排序，排在智能能源管理 Banner 之后 */
const SORT = 5

export class AddHouseholdBanner1790000006000 implements MigrationInterface {
  name = 'AddHouseholdBanner1790000006000'

  async up(queryRunner: QueryRunner): Promise<void> {
    const existing: Array<{ id: number }> = await queryRunner.query(
      this.sql('SELECT id FROM channel WHERE "key" = ?', queryRunner),
      [CHANNEL_KEY],
    )
    // 已存在（新库由 seed 建出，或运营手工建过）则不动
    if (existing.length > 0) return

    const parents: Array<{ id: number }> = await queryRunner.query(
      this.sql('SELECT id FROM channel WHERE "key" = ?', queryRunner),
      [PARENT_KEY],
    )
    // 父栏目不存在（新库尚未跑 seed）时无事可做，交给 seed 带上完整栏目树
    if (parents.length === 0) return

    // 只插入本栏目，不顺延其后几个 Banner 的排序：存量库里的排序运营可能调过，
    // 批量改写会抹掉那些调整。与后续栏目排序值相同时按 id 次序展示，不影响使用
    await queryRunner.query(
      this.sql(
        'INSERT INTO channel (parentId, "key", name, type, sort, formFields, listColumns) VALUES (?, ?, ?, ?, ?, ?, ?)',
        queryRunner,
      ),
      [parents[0].id, CHANNEL_KEY, '智能家居 Banner', 'single', SORT, FORM_FIELDS, LIST_COLUMNS],
    )
  }

  /**
   * 回滚：仅当栏目下没有内容时才删
   * 运营上传过头图后再回滚，删栏目会让那些内容成为无主数据，宁可保留栏目
   */
  async down(queryRunner: QueryRunner): Promise<void> {
    const contents: Array<{ id: number }> = await queryRunner.query(
      'SELECT id FROM content WHERE channelKey = ? LIMIT 1',
      [CHANNEL_KEY],
    )
    if (contents.length > 0) return
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
