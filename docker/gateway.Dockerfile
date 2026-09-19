# 网关镜像 —— 一个 nginx 同时托管两个前端，各占一个端口
#   8080 → admin 管理后台
#   8081 → web   官网前台
# 两个前端的静态资源与 /api 反代都由本容器处理，故浏览器侧始终同源，无需 CORS

# ---------- 阶段 1：构建 admin ----------
FROM node:22-bookworm-slim AS build-admin
WORKDIR /app
COPY admin/package.json admin/package-lock.json ./
RUN npm ci
COPY admin/ ./

# 留空表示同源相对路径，请求由本容器 nginx 反代给 backend
ENV VITE_API_BASE_URL=
ENV VITE_API_PREFIX=/api
# admin 的 router 调 createWebHistory() 未传 base，只能部署在路径根，故固定为 /
ENV VITE_BASE_URL=/
# 原型标注中间件属开发期功能，生产关闭
ENV VITE_ENABLE_ANNOTATION_SAVE=false
RUN npm run build

# ---------- 阶段 2：构建 web ----------
FROM node:22-bookworm-slim AS build-web
WORKDIR /app
COPY web/package.json web/package-lock.json ./
RUN npm ci
COPY web/ ./
ENV VITE_API_BASE_URL=
ENV VITE_API_PREFIX=/api
ENV VITE_BASE_URL=/
RUN npm run build

# ---------- 阶段 3：nginx 托管 ----------
FROM nginx:1.27-alpine AS runtime

# 清掉默认站点，避免 80 端口上残留 It works 页面
RUN rm -f /etc/nginx/conf.d/default.conf

COPY --from=build-admin /app/dist /usr/share/nginx/html/admin
COPY --from=build-web   /app/dist /usr/share/nginx/html/web
COPY docker/nginx/gateway.conf /etc/nginx/conf.d/gateway.conf

EXPOSE 8080 8081

HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -qO- http://127.0.0.1:8081/ >/dev/null 2>&1 || exit 1
