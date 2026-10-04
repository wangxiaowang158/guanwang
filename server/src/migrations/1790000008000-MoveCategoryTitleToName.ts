// 产品类别（hvac-category）的名称统一存到 name 列
//
// 背景：该栏目后台表单只有「名称」（name），但种子把类别名写进了 title。
// 前台与后台下拉都按 title || name 取值，于是运营在后台改名称后 title 仍是旧值，
// 前台筛选按钮和产品的类别下拉都不变——看起来像保存没生效。
//
// 做法：name 为空的行把 title 搬到 name 并清空 title，此后两侧都只认 name 这一份。
// 已手工填过 name 的行不动。
import type { MigrationInterface, QueryRunner } from 'typeorm'

const CHANNEL_KEY = 'hvac-category'

export class MoveCategoryTitleToName1790000008000 implements MigrationInterface {
  name = 'MoveCategoryTitleToName1790000008000'

  async up(queryRunner: QueryRunner): Promise<void> {
    // 同一条语句里 SET 右侧读的是更新前的值，name 取到的是原 title
    await queryRunner.query(
      `UPDATE content SET name = title, title = NULL
       WHERE channelKey = ? AND (name IS NULL OR name = '') AND title IS NOT NULL AND title <> ''`,
      [CHANNEL_KEY],
    )
  }

  /** 不回滚：无法分辨哪些 name 是本迁移搬过去的、哪些是运营后来改的 */
  async down(): Promise<void> {
    // 故意留空
  }
}
