// 首页文案改由后台配置 —— 板块标题、首屏按钮、联系板块标题、业务/服务图标、「我眼中的中瑞恒」板块
//
// 背景：首页各板块的小标题与主标题、首屏两个按钮文字原先写死在前台模板里，后台改不了。
// 做法：
//   1. 板块小标题取栏目名、主标题取栏目的区块副标题（栏目管理里本就有这两项，不新增表）；
//      存量库的栏目名仍是 mock 里的旧名（如「简介」「典型客户」），按旧名精确匹配才改，
//      运营已改过的不动；副标题仅在为空时补上改版前的前台文案，上线后前台观感不变。
//   2. site_config 增加首屏按钮文字与联系板块标题三列，为空时前台用内置文案。
//   3. 业务与行业、技术服务的表单补上「图标」；「我眼中的中瑞恒」配齐展示字段。
import { TableColumn } from 'typeorm'
import type { MigrationInterface, QueryRunner } from 'typeorm'

/** 冻结副本：[栏目 key, mock 旧名, 新名, 主标题]，与 scripts/seed/home-form-fields.ts 此刻一致 */
const HEADINGS: Array<[string, string, string, string | null]> = [
  ['home-intro', '简介', '公司简介', null],
  ['home-business', '主营业务', '业务与行业', '覆盖能源全链路的专业服务方向'],
  ['home-product', '主要产品', '主要产品', '面向建筑能源全生命周期的核心产品'],
  ['home-service', '技术服务', '技术支持及服务', '全周期的专业能源技术服务'],
  ['home-philosophy', '经营理念', '经营理念', null],
  ['home-achievement', '公司业绩', '公司业绩', '用数据说话的专业积累'],
  ['home-customer', '典型客户', '合作伙伴', '与主流品牌携手共建能源生态'],
  ['home-view', '我眼中的中瑞恒', '我眼中的中瑞恒', '媒体与行业的关注和认可'],
  ['home-social', '社会贡献', '社会贡献', '践行绿色低碳发展使命'],
]

/** 需要在表单最前面补「图标」的栏目 */
const ICON_CHANNELS = ['home-business', 'home-service']

/** 「我眼中的中瑞恒」的目标表单；仅当仍是种子原样时整体替换 */
const VIEW_KEY = 'home-view'
const VIEW_FIELDS = ['title', 'description', 'cover', 'link', 'isTop']
const VIEW_SEEDED = JSON.stringify([
  'title', 'keywords', 'description', 'cover', 'file', 'updateTime', 'author', 'source', 'isTop',
])

/** site_config 新增列 */
const SITE_COLUMNS: Array<[string, number, string]> = [
  ['heroPrimaryText', 20, '首屏主按钮文字'],
  ['heroSecondaryText', 20, '首屏次按钮文字'],
  ['contactHeading', 100, '首页联系板块主标题'],
]

/** 解析库里的 JSON 数组，损坏时按空数组处理 */
function parseList(raw: string | null): string[] {
  try {
    const v: unknown = JSON.parse(raw ?? '[]')
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

export class HomeSectionHeadings1790000010000 implements MigrationInterface {
  name = 'HomeSectionHeadings1790000010000'

  async up(queryRunner: QueryRunner): Promise<void> {
    for (const [column, length, comment] of SITE_COLUMNS) {
      if (await queryRunner.hasColumn('site_config', column)) continue
      await queryRunner.addColumn('site_config', new TableColumn({
        name: column, type: 'varchar', length: String(length), isNullable: false, default: "''", comment,
      }))
    }

    for (const [key, oldName, newName, subheading] of HEADINGS) {
      await queryRunner.query(
        this.sql('UPDATE channel SET name = ? WHERE "key" = ? AND name = ?', queryRunner),
        [newName, key, oldName],
      )
      if (subheading) {
        await queryRunner.query(
          this.sql('UPDATE channel SET subheading = ? WHERE "key" = ? AND (subheading IS NULL OR subheading = \'\')', queryRunner),
          [subheading, key],
        )
      }
    }

    for (const key of ICON_CHANNELS) await this.prependIcon(queryRunner, key)
    await this.alignViewForm(queryRunner)
  }

  /** 在表单字段最前面补 icon；已有则不动 */
  private async prependIcon(queryRunner: QueryRunner, key: string): Promise<void> {
    const rows: Array<{ formFields: string | null }> = await queryRunner.query(
      this.sql('SELECT formFields FROM channel WHERE "key" = ?', queryRunner), [key],
    )
    if (rows.length === 0) return
    const current = parseList(rows[0].formFields)
    if (current.includes('icon')) return
    await queryRunner.query(
      this.sql('UPDATE channel SET formFields = ? WHERE "key" = ?', queryRunner),
      [JSON.stringify(['icon', ...current]), key],
    )
  }

  /** 「我眼中的中瑞恒」：种子原样则替换为展示字段，运营改过则只追加缺的 */
  private async alignViewForm(queryRunner: QueryRunner): Promise<void> {
    const rows: Array<{ formFields: string | null }> = await queryRunner.query(
      this.sql('SELECT formFields FROM channel WHERE "key" = ?', queryRunner), [VIEW_KEY],
    )
    if (rows.length === 0) return
    const current = parseList(rows[0].formFields)
    const next = JSON.stringify(current) === VIEW_SEEDED
      ? VIEW_FIELDS
      : [...current, ...VIEW_FIELDS.filter(f => !current.includes(f))]
    await queryRunner.query(
      this.sql('UPDATE channel SET formFields = ? WHERE "key" = ?', queryRunner),
      [JSON.stringify(next), VIEW_KEY],
    )
  }

  /** 只回滚新增列；栏目名与表单配置无法分辨是否被运营再改过，不回滚 */
  async down(queryRunner: QueryRunner): Promise<void> {
    for (const [column] of SITE_COLUMNS) {
      if (await queryRunner.hasColumn('site_config', column)) await queryRunner.dropColumn('site_config', column)
    }
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
