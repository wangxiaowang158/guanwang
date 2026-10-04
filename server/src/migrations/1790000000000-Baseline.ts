// 基线迁移 —— 把「当前实体定义的全部表」作为迁移链的起点
//
// 为什么不是一张张 createTable 手写：
// 项目同时支持 sqlite 与 mysql 两种方言，手写 DDL 要各写一份且长期双份维护；
// 而 TypeORM 自带的 schema builder 本就按实体在当前方言下建表，正是我们要的东西。
//
// 为什么要 hasTable 守卫：
// 存量部署的表早已由 synchronize 或 server/sql/ 手工脚本建好，
// 它们执行本迁移时必须是空操作，否则会撞已存在的表。
// 以 admin 表为锚点判断——它是最早创建且任何部署都必有的表。
import type { MigrationInterface, QueryRunner } from 'typeorm'

export class Baseline1790000000000 implements MigrationInterface {
  name = 'Baseline1790000000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    // 存量库：表已在，基线视为已达成，直接放过
    if (await queryRunner.hasTable('admin')) return

    // 全新库：按当前实体建出完整结构。
    // synchronize 建出的是「最新」结构，已包含后续各条增量迁移要加的列，
    // 因此那些迁移都带 hasColumn / hasTable 守卫，在此场景下自动空转
    await queryRunner.connection.synchronize()
  }

  /**
   * 不提供回滚
   * 基线的反向操作是「删掉全库所有表」，这在生产上是灾难性操作，
   * 且一旦误执行不可恢复。需要重来时请直接重建数据库，而非 revert
   */
  async down(): Promise<void> {
    throw new Error('基线迁移不支持回滚：其反向操作等同于删除全部业务表')
  }
}
