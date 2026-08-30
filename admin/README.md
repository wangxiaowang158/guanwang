# AgentPM Admin

基于 Vue3 + TypeScript + Ant Design Vue 的管理后台系统

## 技术栈

- Vue 3
- TypeScript
- Ant Design Vue 4
- Vue Router 4
- Vite 5
- Axios
- vite-plugin-mock

## 目录结构

```
src/
├── api/                    # API 接口
│   ├── auth.ts            # 认证相关
│   ├── dashboard.ts       # 仪表盘
│   └── user.ts            # 用户管理
├── assets/                # 静态资源
├── components/            # 公共组件
│   └── PageContainer/     # 页面容器
├── composables/           # 组合式函数
│   └── useTheme.ts        # 主题切换
├── layouts/               # 布局
│   ├── MainLayout/        # 主布局
│   └── components/        # 布局组件
│       ├── AppHeader/     # 头部
│       └── AppSidebar/    # 侧边栏
├── router/                # 路由
│   ├── index.ts          # 路由入口
│   └── modules/          # 路由模块
│       ├── dashboard.ts
│       └── user.ts
├── store/                 # 状态管理
│   ├── index.ts          # Store 入口
│   └── modules/          # Store 模块
│       ├── app.ts        # 应用状态
│       └── user.ts       # 用户状态
├── utils/                 # 工具函数
├── views/                 # 页面
│   ├── Dashboard/        # 仪表盘
│   ├── Login/            # 登录
│   └── Users/            # 用户管理
├── App.vue
└── main.ts
```

## 开发规范

### 组件规范
- 所有组件使用文件夹结构
- 主文件统一命名为 `index.vue`
- 使用 `@/` 别名引用 src 目录

### 路由规范
- 路由按模块拆分到 `router/modules/` 目录
- 每个模块独立管理自己的路由

### Store 规范
- 使用 Composition API 风格的 Store
- 按模块拆分到 `store/modules/` 目录
- 通过 `store/index.ts` 统一导出

## 开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build
```

## 默认账号

- 用户名: admin
- 密码: 123456
