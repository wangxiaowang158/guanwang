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

# 容器内进程以非 root 运行；node 用户由基础镜像预置
# 数据目录用于 DB_TYPE=sqlite 时落盘，MySQL 模式下留空不影响
RUN mkdir -p /app/data && chown -R node:node /app

# 直接搬运已编译好的 node_modules，避免运行时再装一次原生模块
COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/package.json ./package.json

USER node
EXPOSE 3000

# 健康检查打后端自带的 /api/health，它会真跑一次 SELECT 1 验证数据库连通
HEALTHCHECK --interval=10s --timeout=5s --start-period=40s --retries=6 \
    CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/main.js"]
