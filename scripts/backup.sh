#!/usr/bin/env bash
# 每日备份 —— 导出 MySQL 全库 + 打包上传目录，按保留天数清理旧件
#
# 对应 SRS 5.3「数据每日自动备份，支持故障恢复」与 6.3「上传的图片文件定期备份」。
# 命名卷只防容器重建，不防宿主磁盘损坏，故备份落到宿主目录，再由宝塔/rsync 外送异地。
#
# 用法：
#   bash scripts/backup.sh              # 用仓库根 .env 的库凭证
#   BACKUP_DIR=/data/bak bash scripts/backup.sh
#
# 定时（宿主 crontab -e，每天 03:17，错开整点避开其他任务）：
#   17 3 * * * cd /path/to/repo && bash scripts/backup.sh >> /var/log/zrh-backup.log 2>&1
#
# 恢复步骤：
#   1) 库：gunzip -c db-YYYYmmdd-HHMM.sql.gz | docker exec -i zrh-mysql mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE"
#   2) 图：docker run --rm -v 项目名_backend-uploads:/restore -v "$PWD":/bak alpine \
#          sh -c 'cd /restore && tar xzf /bak/uploads-YYYYmmdd-HHMM.tar.gz'
#   3) 恢复完重启 backend：docker compose restart backend
#
# 退出码：0 全部成功；非 0 表示某一步失败，crontab 日志里能看到具体是哪步。

set -euo pipefail

# 备份件只对属主可读：db-*.sql.gz 里是全库明文——admin 表的口令哈希、
# member 表手机号、feedback 表客户留言。默认 umask 022 会产出 0644，
# 同宿主任意用户都能拖走，前面不让密码进 ps aux 的防护就断在这一环。
umask 077

# ---------------- 配置 ----------------

# 仓库根目录（脚本在 scripts/ 下，故上跳一级），后续所有相对路径以此为基准
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# 备份落地目录，默认放仓库外的同级 backups/，避免被 git 或部署脚本波及
BACKUP_DIR="${BACKUP_DIR:-$REPO_ROOT/../zrh-backups}"

# 保留天数，超期的备份件自动删除
RETENTION_DAYS="${RETENTION_DAYS:-14}"

# 容器名，与 docker-compose.yaml 的 container_name 对齐
MYSQL_CONTAINER="${MYSQL_CONTAINER:-zrh-mysql}"
BACKEND_CONTAINER="${BACKEND_CONTAINER:-zrh-backend}"

# 容器内上传目录，与 compose 中 backend-uploads 的挂载点一致
UPLOAD_PATH_IN_CONTAINER="${UPLOAD_PATH_IN_CONTAINER:-/app/data/uploads}"

# 时间戳：精确到分钟，同一天多次手工备份不互相覆盖
STAMP="$(date +%Y%m%d-%H%M)"

# ---------------- 读取库凭证 ----------------

# 从 .env 取单个键值：只认行首键名，去掉可能的引号。
# 不用 `source .env`：.env 里含 JWT 密钥等无关变量，整体注入会污染环境，
# 且值里的 # 与空格在 source 下行为与 compose 不一致。
read_env() {
  local key="$1" file="$REPO_ROOT/.env"
  [ -f "$file" ] || return 0
  # 先剥 \r：Windows 编辑过 .env 时值尾带回车，会连进密码导致认证失败，
  # 且两侧 sed 的 $ 锚点也因此匹配不到收尾引号，去引号一并失效。
  # 不统一 trim 尾随空格——密码合法地可以以空格结尾
  sed -n "s/^${key}=//p" "$file" | tail -n 1 \
    | sed -e 's/\r$//' -e 's/^"\(.*\)"$/\1/' -e "s/^'\(.*\)'$/\1/"
}

MYSQL_USER="${MYSQL_USER:-$(read_env MYSQL_USER)}"
MYSQL_PASSWORD="${MYSQL_PASSWORD:-$(read_env MYSQL_PASSWORD)}"
MYSQL_DATABASE="${MYSQL_DATABASE:-$(read_env MYSQL_DATABASE)}"

# compose 里这两项有默认值，此处保持一致，避免 .env 只写了密码时取空
MYSQL_USER="${MYSQL_USER:-zrh}"
MYSQL_DATABASE="${MYSQL_DATABASE:-zrh_website}"

if [ -z "$MYSQL_PASSWORD" ]; then
  echo "[备份] 失败：未取到 MYSQL_PASSWORD，请确认仓库根 .env 已配置" >&2
  exit 1
fi

# ---------------- 前置检查 ----------------

if ! docker inspect -f '{{.State.Running}}' "$MYSQL_CONTAINER" 2>/dev/null | grep -q true; then
  echo "[备份] 失败：容器 $MYSQL_CONTAINER 未在运行" >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"
# 显式收紧：umask 只作用于本次新建，已存在的旧目录（早先用默认 umask 建的）管不到
chmod 700 "$BACKUP_DIR"

echo "[备份] 开始 $STAMP，输出目录 $BACKUP_DIR"

# ---------------- 1. 导出数据库 ----------------

DB_FILE="$BACKUP_DIR/db-$STAMP.sql.gz"

# 密码经 stdin 送入容器内的 MYSQL_PWD，不出现在 docker 命令行参数里：
# 若写成 mysqldump -p"$MYSQL_PASSWORD"，宿主 `ps aux` 能直接看到明文库密码。
# --single-transaction 保证一致性快照且不锁表；--no-tablespaces 免去应用账号
# 没有 PROCESS 权限时的报错；不导出存储过程与事件，本项目未使用。
if ! printf '%s' "$MYSQL_PASSWORD" | docker exec -i "$MYSQL_CONTAINER" sh -c \
  "MYSQL_PWD=\$(cat) mysqldump \
    --single-transaction --quick --no-tablespaces \
    --default-character-set=utf8mb4 \
    -u '$MYSQL_USER' '$MYSQL_DATABASE'" | gzip > "$DB_FILE"; then
  echo "[备份] 失败：数据库导出出错，已删除不完整文件" >&2
  rm -f "$DB_FILE"
  exit 1
fi

# 空文件或过小说明导出实际失败（管道中 mysqldump 失败可能被 gzip 掩盖）
if [ ! -s "$DB_FILE" ] || [ "$(wc -c < "$DB_FILE")" -lt 1024 ]; then
  echo "[备份] 失败：数据库备份文件异常偏小，判定为无效" >&2
  rm -f "$DB_FILE"
  exit 1
fi

echo "[备份] 数据库完成：$(basename "$DB_FILE")（$(du -h "$DB_FILE" | cut -f1)）"

# ---------------- 2. 打包上传目录 ----------------

UPLOAD_FILE="$BACKUP_DIR/uploads-$STAMP.tar.gz"

# 在容器内以上传目录为根打包，解包时不带多层路径前缀，恢复时直接铺回卷内。
# backend 容器停着时跳过而非整体失败：库已备好，图片这份下次再补比彻底没有更好。
if docker inspect -f '{{.State.Running}}' "$BACKEND_CONTAINER" 2>/dev/null | grep -q true; then
  if docker exec "$BACKEND_CONTAINER" tar czf - -C "$UPLOAD_PATH_IN_CONTAINER" . > "$UPLOAD_FILE" 2>/dev/null; then
    echo "[备份] 上传目录完成：$(basename "$UPLOAD_FILE")（$(du -h "$UPLOAD_FILE" | cut -f1)）"
  else
    echo "[备份] 警告：上传目录打包失败，已删除不完整文件" >&2
    rm -f "$UPLOAD_FILE"
  fi
else
  echo "[备份] 警告：容器 $BACKEND_CONTAINER 未运行，跳过上传目录" >&2
fi

# ---------------- 3. 清理超期备份 ----------------

# 只删本脚本产出的两类文件名，不用 `find $BACKUP_DIR -delete` 扫全目录：
# 目录可能被运维放了别的东西，按前缀限定删除范围。
DELETED=0
while IFS= read -r old; do
  rm -f "$old"
  DELETED=$((DELETED + 1))
done < <(find "$BACKUP_DIR" -maxdepth 1 -type f \
  \( -name 'db-*.sql.gz' -o -name 'uploads-*.tar.gz' \) \
  -mtime "+$RETENTION_DAYS" 2>/dev/null)

if [ "$DELETED" -gt 0 ]; then
  echo "[备份] 已清理 $DELETED 个超过 $RETENTION_DAYS 天的旧备份"
fi

echo "[备份] 全部完成，当前目录共 $(find "$BACKUP_DIR" -maxdepth 1 -type f \( -name 'db-*.sql.gz' -o -name 'uploads-*.tar.gz' \) | wc -l | tr -d ' ') 个备份件"
