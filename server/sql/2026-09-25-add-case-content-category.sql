-- 案例内容栏目补「产品类别」字段 —— 前台按行业筛选案例的前提
--
-- 背景：前台「项目案例」页把「行业分类」栏目的条目转成筛选按钮，
-- 按 content.category 与分类名精确比对筛出案例。而 case-content 栏目的
-- formFields 里原先没有 category，后台编辑表单便不出现该字段，
-- 运营无法给案例打行业标签，筛选因此永远筛不出内容。
--
-- 适用场景：已建库的存量部署。新部署由 CMS 种子（channels.json id=1037）自动带上，
-- 无需执行本脚本。
--
-- 按 key 定位而非按 id：不同部署的栏目 id 可能因初始化顺序不同而错位，
-- 而 key 是程序语义标识，各部署一致。
--
-- 执行方式（MySQL）：
--   mysql -u <user> -p <database> < 2026-09-25-add-case-content-category.sql
-- 容器部署：
--   docker exec -i <mysql容器> mysql -u <user> -p<密码> <库名> < 2026-09-25-add-case-content-category.sql
--
-- 注意：content 表本身无需改动——category 列早已存在（暖通产品栏目一直在用），
-- 本脚本只改栏目的表单字段配置。

UPDATE `channel`
SET `formFields` = '["title","category","keywords","description","content","cover","updateTime","author","source","isTop"]'
WHERE `key` = 'case-content';

-- 执行后还需在后台逐条给「案例内容」选择所属行业，
-- 否则前台筛选按钮点下去是空结果：category 为空的条目不属于任何分类。
