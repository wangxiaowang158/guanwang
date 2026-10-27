// 「关于我们 → 招聘职位」区块
//
// 原「加入我们」是一段富文本，职位多了只能堆在一篇里，改一个职位要整篇重排。
// 新增职位列表区块（layout=jobs），每条一个职位，可单独上下架、置顶；原富文本区块保留作招聘说明。
// 存量库按 key 定位插入，与 AddHouseholdBanner 同一做法；全新库同样走这里（seed 不含本区块）
import type { MigrationInterface, QueryRunner } from 'typeorm'

const CHANNEL_KEY = 'about-jobs'
const PARENT_KEY = 'about'
const FORM_FIELDS = JSON.stringify(['title', 'subtitle', 'brand', 'description', 'content', 'isTop'])
const LIST_COLUMNS = JSON.stringify(['sort', 'title', 'createTime', 'isTop'])
/** 排在「加入我们」之后；同排序值按 id 次序展示 */
const SORT = 90

export class AddJobsBlock1790000023000 implements MigrationInterface {
  name = 'AddJobsBlock1790000023000'

  async up(queryRunner: QueryRunner): Promise<void> {
    const existing: Array<{ id: number }> = await queryRunner.query(
      this.sql('SELECT id FROM channel WHERE "key" = ?', queryRunner), [CHANNEL_KEY],
    )
    if (existing.length > 0) return
    const parents: Array<{ id: number }> = await queryRunner.query(
      this.sql('SELECT id FROM channel WHERE "key" = ?', queryRunner), [PARENT_KEY],
    )
    // 父页面不存在（全新库尚未跑 seed）时无事可做；seed 后再启动一次迁移不会重跑，
    // 故 seed-cms 结束时会补建本区块（见 scripts/seed-cms.ts 的 ensureJobsBlock）
    if (parents.length === 0) return
    await insertJobsBlock(
      (sql, params) => queryRunner.query(sql, params),
      queryRunner.connection.options.type === 'mysql',
      parents[0].id,
    )
  }

  /** 回滚：栏目下已有职位时保留，免得成为无主数据 */
  async down(queryRunner: QueryRunner): Promise<void> {
    const contents: Array<{ id: number }> = await queryRunner.query(
      'SELECT id FROM content WHERE channelKey = ? LIMIT 1', [CHANNEL_KEY],
    )
    if (contents.length > 0) return
    await queryRunner.query(this.sql('DELETE FROM channel WHERE "key" = ?', queryRunner), [CHANNEL_KEY])
  }

  /** key 是 MySQL 保留字，按方言换转义符 */
  private sql(sql: string, queryRunner: QueryRunner): string {
    return queryRunner.connection.options.type === 'mysql' ? sql.replace(/"key"/g, '`key`') : sql
  }
}

/**
 * 插入招聘职位区块行，迁移与种子脚本共用
 * @param query 执行 SQL 的函数（迁移传 queryRunner.query，种子传事务内的 EntityManager.query）
 * @param mysql 是否 MySQL 方言
 * @param parentId 「关于我们」栏目 id
 */
export async function insertJobsBlock(
  query: (sql: string, params: unknown[]) => Promise<unknown>,
  mysql: boolean,
  parentId: number,
): Promise<void> {
  const keyCol = mysql ? '`key`' : '"key"'
  await query(
    `INSERT INTO channel (parentId, ${keyCol}, name, type, sort, formFields, listColumns, anchor, layout, subheading)`
    + ' VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [parentId, CHANNEL_KEY, '招聘职位', 'list', SORT, FORM_FIELDS, LIST_COLUMNS, 'jobs', 'jobs', '期待与你同行'],
  )
}
