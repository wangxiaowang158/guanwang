# 后端镜像 —— NestJS 编译为 dist 后以 node 直接运行
# 构建上下文为仓库根目录，故所有 COPY 路径都带 server/ 前缀

# ---------- 阶段 1：安装依赖 ----------
# 用 bookworm-slim 而非 alpine：better-sqlite3 是原生模块，需要 python3/g++ 编译，
# glibc 环境下有官方预编译包可直接落地，失败率远低于 alpine(musl)
FROM node:22-bookworm-slim AS deps
WORKDIR /app

# 原生模块编译工具链；预编译包命中时用不上，但缺了就会构建失败
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

# 先只复制 lock 与清单，让依赖层能被 Docker 缓存复用
COPY server/package.json server/package-lock.json ./
RUN npm ci

# ---------- 阶段 2：编译 TypeScript ----------
FROM deps AS build
WORKDIR /app
COPY server/ ./
RUN npm run build

# ---------- 阶段 3：运行时 ----------
FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
# 固定进程时区：发布时间按「本地时间」解析并回显，库里存 UTC（timezone: 'Z'）。
# 容器默认 UTC，与本机开发（东八区）不一致时同一条内容会差 8 小时、跨零点就差一天。
# 已实测：node:22-bookworm-slim 自带 zoneinfo，无需另装 tzdata
ENV TZ=Asia/Shanghai

# 容器内进程以非 root 运行；node 用户由基础镜像预置
# 数据目录用于 DB_TYPE=sqlite 时落盘，MySQL 模式下留空不影响
# uploads 必须在镜像里先建出来：命名卷只有在挂载点已存在时才继承其属主，
# 否则 Docker 以 root:root 新建该目录，node 用户首次上传即 EACCES
RUN mkdir -p /app/data/uploads && chown -R node:node /app

# 直接搬运已编译好的 node_modules，避免运行时再装一次原生模块
COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/package.json ./package.json
# 启动脚本：先迁移、再空库种子、最后起主进程，见脚本内说明
COPY --chmod=755 docker/server-entrypoint.sh /usr/local/bin/server-entrypoint.sh

USER node
EXPOSE 3000

# 健康检查打后端自带的 /api/health，它会真跑一次 SELECT 1 验证数据库连通，
# 库不通时返回 HTTP 503，r.ok 为假即判不健康。
# start-period 放宽到 90s：首启要先跑迁移与种子，再起主进程
HEALTHCHECK --interval=10s --timeout=5s --start-period=90s --retries=6 \
    CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["/usr/local/bin/server-entrypoint.sh"]
