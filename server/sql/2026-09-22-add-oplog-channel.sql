-- 操作日志栏目行（存量部署执行；新部署由 CMS 种子自动写入）
-- 与 src/modules/cms/seed/channels.json 中 id=1061 的记录保持一致
-- 该栏目仅供管理端使用，portalPath 留空 → 不进前台菜单
INSERT INTO `channel`
  (`id`, `parentId`, `key`, `name`, `type`, `icon`, `sort`, `formFields`, `listColumns`)
VALUES
  (1061, NULL, 'op-log', '操作日志', 'oplog', 'FileSearchOutlined', 14, '[]',
   '["sort","title","createTime","isTop"]')
-- 重复执行时只校正程序语义字段；name 是用户可在后台改的显示名，不覆盖
ON DUPLICATE KEY UPDATE
  `type` = VALUES(`type`),
  `icon` = VALUES(`icon`);
