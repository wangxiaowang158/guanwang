// 后台登录认证 Mock（F01）
// 默认管理员账号 admin / 123456，登录成功签发 token
// 失败统一返回 code:401 与脱敏文案，不区分账号不存在/密码错误，防账号信息泄露
const ADMIN_USERNAME = 'admin'
const ADMIN_PASSWORD = '123456'

export default [
  {
    url: '/api/login',
    method: 'post',
    response: ({ body }) => {
      const { username, password } = body || {}
      // 校验账号密码，成功签发随机 token
      if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        return {
          code: 200,
          message: '登录成功',
          data: {
            token: 'mock-token-' + crypto.randomUUID(),
            username: ADMIN_USERNAME
          }
        }
      }
      // 统一脱敏文案，前端据 code:401 清空密码并保留用户名
      return {
        code: 401,
        message: '账号或密码错误，请重新输入',
        data: null
      }
    }
  },
  {
    url: '/api/logout',
    method: 'post',
    response: () => {
      return {
        code: 200,
        message: '退出成功',
        data: null
      }
    }
  }
]
