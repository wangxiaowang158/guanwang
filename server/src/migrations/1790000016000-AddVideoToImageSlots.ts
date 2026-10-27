// 图片位追加视频字段 —— 卡片、磁贴、品牌区块与首页产品/社会贡献/我眼中的中瑞恒
//
// 背景：前台这些图片位已支持「配了视频就静音循环播放、封面作首帧」，
// 但存量栏目的表单字段里没有 video，运营在后台看不到上传入口。
//
// 策略：只处理表单里已有 cover 的栏目，把 video 插到 cover 后面；已有 video 的跳过。
// 不整体替换，运营手工调过的字段顺序与取舍原样保留
import type { MigrationInterface, QueryRunner } from 'typeorm'

/** 需要追加视频的区块展示形态，冻结副本 */
const LAYOUTS = ['tiles', 'brand', 'cards']

/** 需要追加视频的首页板块栏目，冻结副本 */
const HOME_KEYS = ['home-product', 'home-social', 'home-view']

/** 解析库里的 JSON 数组，损坏时按空数组处理 */
function parseList(raw: string | null): string[] {
  try {
    const v: unknown = JSON.parse(raw ?? '[]')
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

export class AddVideoToImageSlots1790000016000 implements MigrationInterface {
  name = 'AddVideoToImageSlots1790000016000'

  async up(queryRunner: QueryRunner): Promise<void> {
    const q = queryRunner.connection.options.type === 'mysql' ? '`key`' : '"key"'
    // key 是 MySQL 保留字，按方言转义；别名避开保留字，两种方言取值一致
    const rows: Array<{ id: number; channelKey: string; layout: string | null; formFields: string | null }> =
      await queryRunner.query(`SELECT id, ${q} AS channelKey, layout, formFields FROM channel`)

    for (const row of rows) {
      const target = HOME_KEYS.includes(row.channelKey) || (row.layout !== null && LAYOUTS.includes(row.layout))
      if (!target) continue
      const fields = parseList(row.formFields)
      const coverAt = fields.indexOf('cover')
      if (coverAt < 0 || fields.includes('video')) continue
      fields.splice(coverAt + 1, 0, 'video')
      await queryRunner.query('UPDATE channel SET formFields = ? WHERE id = ?', [JSON.stringify(fields), row.id])
    }
  }

  /** 不回滚：无法分辨 video 是本迁移加的还是运营后来勾的，删掉会让已上传的视频在后台失去入口 */
  async down(): Promise<void> {
    // 故意留空
  }
}
