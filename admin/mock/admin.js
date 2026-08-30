// 管理员管理 Mock —— 账号/姓名/密码/权限设置（勾选各菜单）/微信绑定
let aseed = 8000
const aid = () => ++aseed
const now = () => new Date().toLocaleString('zh-CN', { hour12: false })

// 可分配的权限项（对应一级菜单）
export const PERM_OPTIONS = ['首页', '暖通空调产品', '综合能源节能', '智能家居', '项目案例', '新闻资讯', '生态联盟', '关于我们', 'Banner管理', '留言管理']

let admins = [
  { id: aid(), account: 'admin', name: '管理员', perms: [...PERM_OPTIONS], wechatBound: true, createTime: '2021-8-26 17:47:27' },
  { id: aid(), account: 'editor', name: '内容编辑', perms: ['首页', '新闻资讯', '项目案例'], wechatBound: false, createTime: '2024-3-12 09:20:10' }
]

export default [
  {
    url: '/api/admin/list',
    method: 'get',
    response: ({ query }) => {
      let data = [...admins]
      if (query.keyword) {
        const kw = query.keyword
        data = data.filter(a => a.account.includes(kw) || a.name.includes(kw))
      }
      return { code: 200, message: '获取成功', data }
    }
  },
  {
    url: '/api/admin/detail',
    method: 'get',
    response: ({ query }) => {
      const item = admins.find(a => a.id === Number(query.id))
      return { code: 200, message: '获取成功', data: item || null }
    }
  },
  {
    url: '/api/admin/save',
    method: 'post',
    response: ({ body }) => {
      // 不回传密码字段，仅模拟保存
      const { password, ...rest } = body
      if (body.id) {
        const item = admins.find(a => a.id === body.id)
        if (item) Object.assign(item, rest)
      } else {
        admins.push({ ...rest, id: aid(), wechatBound: false, createTime: now() })
      }
      return { code: 200, message: '保存成功', data: null }
    }
  },
  {
    url: '/api/admin/delete',
    method: 'delete',
    response: ({ query }) => {
      admins = admins.filter(a => a.id !== Number(query.id))
      return { code: 200, message: '删除成功', data: null }
    }
  }
]
