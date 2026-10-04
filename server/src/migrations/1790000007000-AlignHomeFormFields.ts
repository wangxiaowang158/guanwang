// 首页板块栏目的表单字段与前台取数口径对齐
//
// 背景：首页板块栏目沿用了通用表单（标题/关键字/描述/内容/封面/作者…），
// 而前台装配（home-section.service.ts）读的是另一组列：
//   业绩单位读 subtitle、合作伙伴 Logo/链接读 whiteCover/link、
//   公司简介正文读 content、主要产品名称读 name ——这些后台表单里都没有，运营填不了。
//
// 策略：库里的配置若仍是种子写入的原样（运营没动过），整体替换为目标字段；
// 若已被手工调整，只把缺的目标字段追加到末尾，不删运营自己加的字段。
import type { MigrationInterface, QueryRunner } from 'typeorm'

/** 目标字段，冻结副本：与 scripts/seed/home-form-fields.ts 此刻一致，此后两边各自演进 */
const TARGET: Record<string, string[]> = {
  'home-intro': ['title', 'subtitle', 'content'],
  'home-philosophy': ['title', 'content'],
  'home-business': ['title', 'description', 'isTop'],
  'home-product': ['name', 'subtitle', 'content', 'cover', 'isTop'],
  'home-service': ['title', 'description', 'isTop'],
  'home-customer': ['title', 'whiteCover', 'link', 'isTop'],
  'home-achievement': ['title', 'subtitle', 'description', 'isTop'],
  'home-social': ['title', 'description', 'cover', 'isTop'],
}

/** 种子曾写入的原始配置：命中其一即视为运营未改动，可整体替换 */
const SEEDED_FORMS = [
  ['title', 'keywords', 'description', 'content', 'cover', 'updateTime', 'author', 'source', 'isTop'],
  ['title', 'keywords', 'description', 'cover', 'file', 'updateTime', 'author', 'source', 'isTop'],
  ['title', 'subtitle', 'intro', 'cover', 'whiteCover', 'link', 'updateTime', 'author', 'source', 'isTop'],
  ['title', 'keywords', 'description', 'cover', 'updateTime', 'author', 'source', 'isTop'],
].map(f => JSON.stringify(f))

const SEEDED_COLUMNS = JSON.stringify(['sort', 'title', 'createTime', 'isTop'])
const PRODUCT_COLUMNS = JSON.stringify(['sort', 'name', 'createTime', 'isTop'])

/** 解析库里的 JSON 数组，损坏时按空数组处理 */
function parseList(raw: string | null): string[] {
  try {
    const v: unknown = JSON.parse(raw ?? '[]')
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

export class AlignHomeFormFields1790000007000 implements MigrationInterface {
  name = 'AlignHomeFormFields1790000007000'

  async up(queryRunner: QueryRunner): Promise<void> {
    for (const [key, target] of Object.entries(TARGET)) {
      const rows: Array<{ formFields: string | null; listColumns: string | null }> = await queryRunner.query(
        this.sql('SELECT formFields, listColumns FROM channel WHERE "key" = ?', queryRunner),
        [key],
      )
      // 栏目不存在（新库尚未跑 seed）时交给 seed 带上正确配置
      if (rows.length === 0) continue
      const current = parseList(rows[0].formFields)
      const untouched = SEEDED_FORMS.includes(JSON.stringify(current))
      const next = untouched ? target : [...current, ...target.filter(f => !current.includes(f))]

      let columns = rows[0].listColumns
      // 主要产品以 name 为名称，列表列仍是 title 时整列为空
      // 先规整再比，与 formFields 同口径：手工 SQL 写入时空白不同也能认出是种子原样
      if (key === 'home-product' && JSON.stringify(parseList(columns)) === SEEDED_COLUMNS) columns = PRODUCT_COLUMNS

      await queryRunner.query(
        this.sql('UPDATE channel SET formFields = ?, listColumns = ? WHERE "key" = ?', queryRunner),
        [JSON.stringify(next), columns, key],
      )
    }
  }

  /** 不回滚：无法分辨当前配置是本迁移写的还是运营后来调的，回滚可能破坏后台表单 */
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
