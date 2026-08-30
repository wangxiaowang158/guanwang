#!/usr/bin/env node

/**
 * 清理脚本：只保留组织管理和权限管理模块
 *
 * 功能：删除项目中与「组织管理」「权限管理」无关的所有内容
 *
 * 清理范围：
 * - src/views         中不在保留列表的页面目录
 * - src/router/modules 中不在保留列表的路由文件
 * - src/api           中不在保留列表的 API 文件
 * - mock              中不在保留列表的 Mock 文件
 *
 * 同时重写：
 * - src/router/index.ts                          → 只导入保留的路由模块
 * - src/mock/index.ts                            → 只导入保留的 mock 模块
 * - src/layouts/components/AppSidebar/menuItems.ts → 只保留对应菜单项
 *
 * 使用方法：
 *   node scripts/trim-to-org-permission.js
 *
 * 或添加到 package.json scripts：
 *   "trim": "node scripts/trim-to-org-permission.js"
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ==================== 配置区域 ====================

/**
 * 白名单：需要保留的模块
 * 所有不在列表中的文件/目录都会被自动删除
 */
const KEEP_MODULES = {
  // src/views 中需要保留的目录
  views: [
    'Login',        // 登录页（必须保留）
    'Organization', // 组织管理（部门 / 人员 / 岗位）
    'Permission',   // 权限管理（菜单 / 角色）
  ],

  // src/router/modules 中需要保留的路由文件
  router: [
    'organization.ts', // 组织管理路由
    'permission.ts',   // 权限管理路由
  ],

  // src/api 中需要保留的 API 文件
  api: [
    'auth.ts',       // 登录认证
    'department.ts', // 部门管理
    'user.ts',       // 人员管理
    'position.ts',   // 岗位管理
    'menu.ts',       // 菜单管理
    'role.ts',       // 角色管理
  ],

  // mock 目录中需要保留的 Mock 文件
  mock: [
    'auth.js',       // 登录认证 Mock
    'department.js', // 部门管理 Mock
    'user.js',       // 人员管理 Mock
    'position.js',   // 岗位管理 Mock
    'menu.js',       // 菜单管理 Mock
    'role.js',       // 角色管理 Mock
  ],
}

// ==================== 工具函数 ====================

/**
 * 删除文件或目录（递归）
 * @param {string} filePath - 绝对路径
 */
function deleteFileOrDir(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  路径不存在，跳过: ${filePath}`)
    return
  }

  const stats = fs.statSync(filePath)
  if (stats.isDirectory()) {
    fs.rmSync(filePath, { recursive: true, force: true })
    console.log(`✅ 已删除目录: ${filePath}`)
  } else {
    fs.unlinkSync(filePath)
    console.log(`✅ 已删除文件: ${filePath}`)
  }
}

/**
 * 扫描目录，删除所有不在白名单中的条目
 * @param {string} dir       - 目标目录绝对路径
 * @param {string[]} keepList - 白名单文件/目录名列表
 * @param {string} label     - 日志标签
 */
function cleanDir(dir, keepList, label) {
  console.log(`\n📁 开始清理 ${label}...`)

  if (!fs.existsSync(dir)) {
    console.log(`⚠️  目录不存在，跳过: ${dir}`)
    return
  }

  const all = fs.readdirSync(dir)
  const toDelete = all.filter(name => !name.startsWith('.') && !keepList.includes(name))

  if (toDelete.length === 0) {
    console.log('✅ 没有需要删除的条目')
    return
  }

  console.log(`📋 将删除 ${toDelete.length} 个条目: ${toDelete.join(', ')}`)
  toDelete.forEach(name => deleteFileOrDir(path.join(dir, name)))
}

// ==================== 重写文件 ====================

/**
 * 重写 src/router/index.ts
 * 只导入保留的路由模块，默认跳转到部门管理页
 */
function rewriteRouterIndex(routerDir) {
  const filePath = path.join(routerDir, '..', 'index.ts')
  const content = `import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import MainLayout from '@/layouts/MainLayout'

// 只保留组织管理和权限管理路由模块
import organizationRoutes from './modules/organization'
import permissionRoutes from './modules/permission'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login'),
    meta: { title: '登录' }
  },
  {
    path: '/',
    component: MainLayout,
    redirect: '/organization/department',
    children: [
      ...organizationRoutes,
      ...permissionRoutes,
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫：未登录跳转到登录页
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token')

  if (to.meta?.title) {
    document.title = \`\${to.meta.title} - 管理后台\`
  }

  if (to.path !== '/login' && !token) {
    next('/login')
  } else if (to.path === '/login' && token) {
    next('/organization/department')
  } else {
    next()
  }
})

export default router
`
  fs.writeFileSync(filePath, content, 'utf-8')
  console.log(`✅ 已重写: src/router/index.ts`)
}

/**
 * 重写 src/mock/index.ts
 * 只导入保留的 mock 模块，移除已删除文件的导入和注册
 */
function rewriteMockIndex(root) {
  const filePath = path.join(root, 'src/mock/index.ts')

  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  src/mock/index.ts 不存在，跳过`)
    return
  }

  const content = `/**
 * Mock 数据入口
 * 使用 mockjs 在浏览器端拦截 XHR 请求
 * 通过 .env 的 VITE_USE_MOCK 控制开关
 * 注意：原始 XMLHttpRequest 在 main.ts 中保存（import 会提升，不能在这里保存）
 */
import Mock from 'mockjs'

// 只导入组织管理和权限管理相关的 mock 模块
import authMocks from '../../mock/auth'
import departmentMocks from '../../mock/department'
import userMocks from '../../mock/user'
import positionMocks from '../../mock/position'
import menuMocks from '../../mock/menu'
import roleMocks from '../../mock/role'

// 注册 mock 接口
function setupMock() {
  Mock.setup({ timeout: '100-300' })

  const allMocks = [
    ...authMocks,
    ...departmentMocks,
    ...userMocks,
    ...positionMocks,
    ...menuMocks,
    ...roleMocks,
  ]

  allMocks.forEach(({ url, method, response }) => {
    const urlPattern = new RegExp(url.replace(/:(\w+)/g, '([^/]+)'))
    const httpMethod = (method || 'get').toLowerCase()

    Mock.mock(urlPattern, httpMethod, (options: any) => {
      let body = {}
      let query: Record<string, string> = {}
      let params: Record<string, string> = {}

      if (options.body) {
        try { body = JSON.parse(options.body) } catch { body = {} }
      }

      const urlObj = new URL(options.url, 'http://localhost')
      urlObj.searchParams.forEach((value, key) => { query[key] = value })

      const match = options.url.match(urlPattern)
      const paramNames = (url.match(/:(\w+)/g) || []).map((p: string) => p.slice(1))
      paramNames.forEach((name: string, idx: number) => {
        if (match && match[idx + 1]) params[name] = match[idx + 1]
      })

      return response({ body, query, params, headers: {} })
    })
  })
}

// 开关：VITE_USE_MOCK=true 时才注册
if (import.meta.env.VITE_USE_MOCK === 'true') {
  setupMock()
}
`
  fs.writeFileSync(filePath, content, 'utf-8')
  console.log(`✅ 已重写: src/mock/index.ts`)
}

/**
 * 重写 src/layouts/components/AppSidebar/menuItems.ts
 * 只保留组织管理和权限管理两个菜单组
 */
function rewriteMenuItems(root) {
  const filePath = path.join(root, 'src/layouts/components/AppSidebar/menuItems.ts')

  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  menuItems.ts 不存在，跳过: ${filePath}`)
    return
  }

  const content = `import { h } from 'vue'
import {
  SafetyOutlined, MenuOutlined, TeamOutlined,
  ApartmentOutlined, ContactsOutlined, SolutionOutlined
} from '@ant-design/icons-vue'

// 侧边栏菜单配置，只保留组织管理和权限管理
// 新增路由时只需在此处维护，无需同步修改其他文件
export const menuItems = [
  {
    key: 'organization',
    icon: () => h(ApartmentOutlined),
    label: '组织管理',
    title: '组织管理',
    children: [
      { key: '/organization/department', icon: () => h(ApartmentOutlined), label: '部门管理', title: '部门管理' },
      { key: '/organization/user',       icon: () => h(ContactsOutlined),  label: '人员管理', title: '人员管理' },
      { key: '/organization/position',   icon: () => h(SolutionOutlined),  label: '岗位管理', title: '岗位管理' }
    ]
  },
  {
    key: 'permission',
    icon: () => h(SafetyOutlined),
    label: '权限管理',
    title: '权限管理',
    children: [
      { key: '/permission/menu', icon: () => h(MenuOutlined), label: '菜单管理', title: '菜单管理' },
      { key: '/permission/role', icon: () => h(TeamOutlined), label: '角色管理', title: '角色管理' }
    ]
  }
]
`
  fs.writeFileSync(filePath, content, 'utf-8')
  console.log(`✅ 已重写: src/layouts/components/AppSidebar/menuItems.ts`)
}

// ==================== 摘要 ====================

function showSummary() {
  console.log('\n' + '='.repeat(60))
  console.log('📊 清理摘要')
  console.log('='.repeat(60))
  console.log('\n🔒 保留的核心模块：')
  console.log('  Views  :', KEEP_MODULES.views.join(', '))
  console.log('  Router :', KEEP_MODULES.router.join(', '))
  console.log('  API    :', KEEP_MODULES.api.join(', '))
  console.log('  Mock   :', KEEP_MODULES.mock.join(', '))
  console.log('\n' + '='.repeat(60))
  console.log('✨ 清理完成！项目现在只保留组织管理和权限管理模块。')
  console.log('='.repeat(60))
  console.log('\n💡 提示：')
  console.log('  1. 运行 npm run dev 验证项目是否正常启动')
  console.log('  2. 如需恢复，请使用 git 还原删除的文件')
  console.log('  3. 建议清理前先执行 git commit 保存当前状态\n')
}

// ==================== 确认提示 ====================

function confirmClean() {
  console.log('\n' + '='.repeat(60))
  console.log('⚠️  警告：此操作将删除所有不在保留列表中的模块！')
  console.log('='.repeat(60))
  console.log('\n清理策略（白名单模式）：')
  console.log('  ✅ 保留列表中的模块会被保留')
  console.log('  ❌ 其他所有模块都会被删除')
  console.log('\n保留的核心模块：')
  console.log('  Views  :', KEEP_MODULES.views.join(', '))
  console.log('  Router :', KEEP_MODULES.router.join(', '))
  console.log('  API    :', KEEP_MODULES.api.join(', '))
  console.log('  Mock   :', KEEP_MODULES.mock.join(', '))
  console.log('\n如需取消，请在 5 秒内按 Ctrl+C ...\n')
}

// ==================== 主函数 ====================

async function main() {
  try {
    const root = path.resolve(__dirname, '..')

    confirmClean()
    await new Promise(resolve => setTimeout(resolve, 5000))

    console.log('🚀 开始清理...\n')

    // 1. 清理 views
    cleanDir(path.join(root, 'src/views'), KEEP_MODULES.views, 'src/views')

    // 2. 清理 router/modules
    cleanDir(path.join(root, 'src/router/modules'), KEEP_MODULES.router, 'src/router/modules')

    // 3. 清理 src/api
    cleanDir(path.join(root, 'src/api'), KEEP_MODULES.api, 'src/api')

    // 4. 清理 mock
    cleanDir(path.join(root, 'mock'), KEEP_MODULES.mock, 'mock')

    // 5. 重写 router/index.ts
    console.log('\n📝 重写 src/router/index.ts...')
    rewriteRouterIndex(path.join(root, 'src/router/modules'))

    // 6. 重写 src/mock/index.ts
    console.log('\n📝 重写 src/mock/index.ts...')
    rewriteMockIndex(root)

    // 7. 重写 menuItems.ts
    console.log('\n📝 重写 src/layouts/components/AppSidebar/menuItems.ts...')
    rewriteMenuItems(root)

    showSummary()
  } catch (error) {
    console.error('\n❌ 清理过程中发生错误:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

main()
