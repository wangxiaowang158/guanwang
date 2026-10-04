// 管理端写操作的中文说明目录 —— 日志列表直接展示，不让运营去认 HTTP 路径
// 键为「方法 + 路径模板」，路径里的数字段统一归一成 :id

/** 一条写操作的归类 */
export interface OpLogMeta {
  module: string
  action: string
}

/**
 * 写操作目录
 * 新增写接口时在此补一行；漏补不会报错，只是日志里显示成「方法 + 路径」
 *
 * 新增用 `@Res()` 手写响应的写接口时要留意：那种接口绕过统一响应拦截器，
 * 审计侧拿不到业务码，失败会被记成成功，需在接口内自行调 OpLogService.write()
 *
 * 不含 `POST /mgmt/auth/login` 与 `POST /mgmt/auth/logout`：
 * 两者都不挂 AdminGuard，拦截器取不到操作人因而不记录。
 * 登录成败由登录日志单独记，登出对无状态 JWT 而言服务端无状态变更，无可审计内容
 */
const CATALOG: Record<string, OpLogMeta> = {
  'PUT /mgmt/auth/password': { module: '个人设置', action: '修改自己的密码' },

  'POST /mgmt/admin/add': { module: '管理员管理', action: '新增管理员' },
  'PUT /mgmt/admin/update': { module: '管理员管理', action: '修改管理员' },
  'PUT /mgmt/admin/reset-password': { module: '管理员管理', action: '重置管理员密码' },
  'DELETE /mgmt/admin/delete': { module: '管理员管理', action: '删除管理员' },

  'PUT /mgmt/auth-config': { module: '登录安全配置', action: '修改登录安全策略' },

  'POST /mgmt/channel/add': { module: '栏目管理', action: '新增栏目' },
  'PUT /mgmt/channel/update': { module: '栏目管理', action: '修改栏目' },
  'DELETE /mgmt/channel/delete': { module: '栏目管理', action: '删除栏目' },

  'POST /mgmt/content/save': { module: '内容管理', action: '保存内容' },
  'DELETE /mgmt/content/delete': { module: '内容管理', action: '删除内容' },
  'PUT /mgmt/content/top': { module: '内容管理', action: '设置内容置顶' },
  'PUT /mgmt/content/sort': { module: '内容管理', action: '调整内容排序' },

  'POST /mgmt/site/save': { module: '基本信息', action: '保存站点信息' },

  'POST /mgmt/feedback/reply/:id': { module: '意见反馈', action: '回复反馈' },
  'PUT /mgmt/feedback/status/:id': { module: '意见反馈', action: '修改反馈状态' },
  'DELETE /mgmt/feedback/delete/:id': { module: '意见反馈', action: '删除反馈' },
  'DELETE /mgmt/feedback/batch': { module: '意见反馈', action: '批量删除反馈' },

  'PUT /mgmt/member/status/:id': { module: '会员管理', action: '修改会员状态' },
  'PUT /mgmt/member/reset-password/:id': { module: '会员管理', action: '重置会员密码' },
  'DELETE /mgmt/member/delete/:id': { module: '会员管理', action: '删除会员' },

  'DELETE /mgmt/login-log/clear': { module: '登录日志', action: '清理登录日志' },
  'DELETE /mgmt/visit-stats/clear': { module: '访问统计', action: '清理访问记录' },
  'DELETE /mgmt/op-log/clear': { module: '操作日志', action: '清理操作日志' },

  'POST /mgmt/upload/image': { module: '素材上传', action: '上传图片' },
  'POST /mgmt/upload/video': { module: '素材上传', action: '上传视频' },

  'DELETE /mgmt/media/delete': { module: '素材库', action: '删除素材' },
}

/** 未收录路径的兜底模块名 */
const FALLBACK_MODULE = '其他'

/**
 * 把路径里的数字段归一成 :id，使 `/mgmt/feedback/reply/12` 能命中模板
 * @param path 已去掉全局前缀与查询串的路径
 */
export function normalizePath(path: string): string {
  return path.replace(/\/\d+(?=\/|$)/g, '/:id')
}

/**
 * 查路径对应的中文说明
 * @param method HTTP 方法（大写）
 * @param path 已去掉全局前缀与查询串的路径
 */
export function lookupOpLogMeta(method: string, path: string): OpLogMeta {
  const key = `${method} ${normalizePath(path)}`
  const hit = CATALOG[key]
  if (hit) return hit
  // 未收录时仍要留痕：宁可显示得糙，也不能因为没配目录就不记日志
  return { module: FALLBACK_MODULE, action: key }
}

/** 全部模块名，供后台筛选下拉使用（去重后按录入顺序） */
export function allOpLogModules(): string[] {
  const seen = new Set<string>()
  for (const meta of Object.values(CATALOG)) seen.add(meta.module)
  seen.add(FALLBACK_MODULE)
  return [...seen]
}
