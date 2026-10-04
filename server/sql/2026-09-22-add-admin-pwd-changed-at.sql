-- 管理员表新增「密码最后变更时间」列，用于改密后失效存量 JWT
--
-- 适用场景：部署时 DB_SYNCHRONIZE=false（生产建议关闭自动同步），需手工补列。
-- 若 DB_SYNCHRONIZE=true，应用启动时 TypeORM 会自动加上此列，无需执行本脚本。
--
-- 默认值取 0：签发 token 时载荷里写入当时的 pwdChangedAt，
-- 守卫比对「载荷值 != 库里值」才判为已失效。存量 token 没有该字段，
-- 守卫按 0 处理，与列默认值 0 相等，因此升级瞬间不会把所有人踢下线。
--
-- 执行方式（MySQL）：
--   mysql -u <user> -p <database> < 2026-09-22-add-admin-pwd-changed-at.sql
-- 容器部署：
--   docker exec -i <mysql容器> mysql -u <user> -p<密码> <库名> < 2026-09-22-add-admin-pwd-changed-at.sql

ALTER TABLE `admin`
  ADD COLUMN `pwdChangedAt` BIGINT NOT NULL DEFAULT 0
  COMMENT '密码最后变更时间（Unix 秒），改密后旧 token 失效依据';

-- 存量数据兜底：列默认值已覆盖新旧行，此句仅用于重复执行或历史空值场景
UPDATE `admin` SET `pwdChangedAt` = 0 WHERE `pwdChangedAt` IS NULL;
