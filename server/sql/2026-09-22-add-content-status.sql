-- 内容表新增发布状态列（草稿 / 已发布）
--
-- 适用场景：部署时 DB_SYNCHRONIZE=false（生产建议关闭自动同步），需手工补列。
-- 若 DB_SYNCHRONIZE=true，应用启动时 TypeORM 会自动加上此列，无需执行本脚本。
--
-- 默认值取 published：存量内容在加列前都是「填完即对外」的，
-- 若默认成 draft，升级瞬间官网全站内容会从前台消失。
--
-- 执行方式（MySQL）：
--   mysql -u <user> -p <database> < 2026-09-22-add-content-status.sql
-- 容器部署：
--   docker exec -i <mysql容器> mysql -u <user> -p<密码> <库名> < 2026-09-22-add-content-status.sql

ALTER TABLE `content`
  ADD COLUMN `status` VARCHAR(16) NOT NULL DEFAULT 'published'
  COMMENT '发布状态：draft 草稿 / published 已发布';

-- 前台查询按 channelKey + status 过滤，补索引避免全表扫
CREATE INDEX `IDX_content_status` ON `content` (`status`);

-- 存量数据兜底：列默认值已覆盖新旧行，此句仅用于重复执行或历史空值场景
UPDATE `content` SET `status` = 'published' WHERE `status` IS NULL OR `status` = '';
