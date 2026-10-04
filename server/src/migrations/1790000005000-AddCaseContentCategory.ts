// 案例内容栏目补「产品类别」字段 —— 对应原 server/sql/2026-09-25-add-case-content-category.sql
//
// 背景：前台「项目案例」页把「行业分类」栏目的条目转成筛选按钮，
// 按 content.category 与分类名精确比对筛出案例。而 case-content 栏目的
// formFields 里原先没有 category，后台编辑表单便不出现该字段，
// 运营无法给案例打行业标签，筛选因此永远筛不出内容。
//
// content 表本身无需改动——category 列早已存在，本迁移只改栏目的表单字段配置。
import type { MigrationInterface, QueryRunner } from 'typeorm'

const CHANNEL_KEY = 'case-content'

/** 与 seed/channels.json 中 id=1037 的 formFields 保持一致 */
const FORM_FIELDS = JSON.stringify([
  'title', 'category', 'keywords', 'description', 'content', 'cover', 'updateTime', 'author', 'source', 'isTop',
])

export class AddCaseContentCategory1790000005000 implements MigrationInterface {
  name = 'AddCaseContentCategory1790000005000'

  async up(queryRunner: QueryRunner): Promise<void> {
    const rows: Array<{ formFields: string | null }> = await queryRunner.query(
      this.sql('SELECT formFields FROM channel WHERE "key" = ?', queryRunner),
      [CHANNEL_KEY],
    )
    // 栏目不存在（新库尚未跑 seed）时无事可做，交给 seed 带上正确配置
    if (rows.length === 0) return
    // 已含 category 则跳过：运营可能在后台自行调整过字段顺序或增删了其他字段，
    // 无条件覆盖会把那些改动抹掉
    if ((rows[0].formFields ?? '').includes('"category"')) return

    await queryRunner.query(
      this.sql('UPDATE channel SET formFields = ? WHERE "key" = ?', queryRunner),
      [FORM_FIELDS, CHANNEL_KEY],
    )
  }

  /**
   * 不回滚字段配置
   * 反向操作是「把 category 摘掉」，但执行时无法分辨当前配置是本迁移写的
   * 还是运营后来手工调的，摘错等于破坏后台表单
   */
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
