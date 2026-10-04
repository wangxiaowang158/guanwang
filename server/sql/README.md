# 手工 SQL 脚本（已被迁移取代）

本目录下的 `.sql` 脚本**只对 2026-09 之前的存量部署有意义**，新部署与后续变更一律走 TypeORM 迁移：

```bash
cd server
npm run migration:show     # 看已执行 / 待执行清单
npm run migration:run      # 应用全部待执行迁移
npm run migration:revert   # 回滚最后一条
```

迁移源码在 `server/src/migrations/`，清单在同目录 `index.ts`。

## 两者的对应关系

| SQL 脚本 | 对应迁移 |
|---------|---------|
| `2026-09-22-add-content-status.sql` | `1790000001000-AddContentStatus.ts` |
| `2026-09-22-add-admin-pwd-changed-at.sql` | `1790000002000-AddAdminPwdChangedAt.ts` |
| `2026-09-22-add-admin-op-log.sql` | `1790000003000-AddAdminOpLog.ts` |
| `2026-09-22-add-oplog-channel.sql` | `1790000004000-AddOpLogChannel.ts` |
| `2026-09-25-add-case-content-category.sql` | `1790000005000-AddCaseContentCategory.ts` |

每条迁移都带 `hasColumn` / `hasTable` / 先查后写的守卫，**已手工执行过上表左侧脚本的库再跑 `migration:run` 不会重复改动**，只会把迁移记录补进 `migrations` 表。

保留脚本不删：存量部署的运维手册里可能仍引用这些文件名，删掉会让历史记录断链。新增表结构变更请写迁移，不要再往本目录加 `.sql`。

## 为什么迁移不用手写 DDL

项目同时支持 sqlite（本地）与 mysql（生产）。迁移统一走 TypeORM 的 `QueryRunner` schema API（`addColumn` / `createTable` / `createIndex`），由它按当前方言生成 DDL，避免两份 SQL 长期双向维护。涉及数据写入的迁移（栏目行、字段配置）用参数化 `query()`，并按方言切换 `key` 列的转义符——`key` 是 MySQL 保留字。

## 首次部署

`DB_SYNCHRONIZE` 保持 `false`，直接跑 `npm run migration:run`：基线迁移检测到库里没有 `admin` 表，会按当前实体建出完整结构，随后各条增量迁移自动空转。**不再需要先置 `DB_SYNCHRONIZE=true` 建表。** 建完表再跑 `npm run seed:cms` 写入初始栏目与站点信息。

Docker 部署无需手工执行：backend 容器启动时由 `docker/server-entrypoint.sh` 依次执行迁移、`seed-cms --if-empty`（仅栏目表为空时写入）、主进程。
