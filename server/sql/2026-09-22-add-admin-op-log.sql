-- 管理端操作日志表
--
-- 适用场景：部署时 DB_SYNCHRONIZE=false（生产建议关闭自动同步），需手工建表。
-- 若 DB_SYNCHRONIZE=true，应用启动时 TypeORM 会自动建表，无需执行本脚本。
--
-- 操作人账号/姓名存快照而非外键：账号改名或被删后，
-- 日志仍须显示当时是谁操作的，做外键反而会在删账号时连带删审计记录。
--
-- 执行方式（MySQL）：
--   mysql -u <user> -p <database> < 2026-09-22-add-admin-op-log.sql
-- 容器部署：
--   docker exec -i <mysql容器> mysql -u <user> -p<密码> <库名> < 2026-09-22-add-admin-op-log.sql

CREATE TABLE IF NOT EXISTS `admin_op_log` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `adminId` INT NOT NULL COMMENT '操作人 id',
  `adminAccount` VARCHAR(50) NOT NULL COMMENT '操作人账号快照',
  `adminName` VARCHAR(50) NULL COMMENT '操作人姓名快照',
  `action` VARCHAR(100) NOT NULL COMMENT '操作说明，未收录路径回落为「方法 + 路径」',
  `module` VARCHAR(50) NOT NULL COMMENT '所属模块',
  `method` VARCHAR(10) NOT NULL COMMENT 'HTTP 方法',
  `path` VARCHAR(200) NOT NULL COMMENT '请求路径，不含查询串',
  `params` TEXT NULL COMMENT '请求参数快照（已脱敏、超长截断）',
  `ip` VARCHAR(64) NULL COMMENT '操作来源 IP',
  `result` VARCHAR(20) NOT NULL COMMENT '操作结果：success / failure',
  `errorMessage` VARCHAR(300) NULL COMMENT '失败原因，成功时为空',
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '操作时间',
  PRIMARY KEY (`id`),
  KEY `IDX_admin_op_log_adminId` (`adminId`),
  KEY `IDX_admin_op_log_module` (`module`),
  KEY `IDX_admin_op_log_result` (`result`),
  KEY `IDX_admin_op_log_createdAt` (`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='管理端操作日志';
