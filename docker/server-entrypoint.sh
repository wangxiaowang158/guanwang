#!/bin/sh
# 后端容器启动脚本 —— 迁移 → 空库种子 → 主进程，任一步失败即退出
#
# 为什么放在启动时而不是让部署方手工执行：
# 主进程启动时 AdminModule 就要查 admin 表，全新库没表会抛错重启；
# 而 docker compose exec 要求容器已在运行，这时根本进不去——鸡生蛋。
# 迁移本身带 hasTable/hasColumn 守卫且有执行记录，重复跑只会空转。
set -e

node dist/scripts/run-migrations.js

# 仅全新库（栏目表为空）写入栏目树、站点信息与示例内容；已有数据时直接跳过，
# 不会覆盖后台改过的配置
node dist/scripts/seed-cms.js --if-empty

# exec 让 node 接管 PID 1，docker stop 的 SIGTERM 能直达应用
exec node dist/main.js
