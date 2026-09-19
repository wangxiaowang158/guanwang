// 登录态与权限 —— 令牌持久化在 localStorage，身份权限每次会话向后端取，不做本地缓存
// 权限项取值为一级菜单名，与后端 PermGuard 同源（见 constants/menu.ts）
import { computed, ref } from 'vue'
import { getProfile, type AdminProfile } from '@/api/auth'

interface UserState {
  token: string
  username: string
  /** 当前登录管理员的身份与权限，登录成功时写入；刷新页面后为 null，需重新拉取 */
  userInfo: AdminProfile | null
}

const state = ref<UserState>({
  token: localStorage.getItem('token') || '',
  username: localStorage.getItem('username') || '',
  userInfo: null
})

// 同一会话内的并发调用共享一次 profile 拉取，避免守卫与页面各发一次
let profileRequest: Promise<AdminProfile | null> | null = null

/** 已授权的一级菜单名清单；超管为空数组，权限由 isSuper 表达 */
const perms = computed(() => state.value.userInfo?.perms ?? [])

/** 是否超级管理员（不受权限清单限制） */
const isSuper = computed(() => state.value.userInfo?.isSuper === true)

export const useUserStore = () => {
  const setToken = (token: string) => {
    state.value.token = token
    localStorage.setItem('token', token)
  }

  const setUsername = (username: string) => {
    state.value.username = username
    localStorage.setItem('username', username)
  }

  const setUserInfo = (userInfo: AdminProfile | null) => {
    state.value.userInfo = userInfo
  }

  /**
   * 确保身份权限已就绪
   * 刷新页面后内存中的 userInfo 会丢失，而菜单过滤依赖它，故在路由守卫里先补拉
   * @returns 身份信息；令牌失效或请求失败返回 null
   */
  const ensureProfile = async (): Promise<AdminProfile | null> => {
    if (state.value.userInfo) return state.value.userInfo
    if (!state.value.token) return null
    if (!profileRequest) {
      profileRequest = getProfile()
        .then(({ data: res }) => {
          if (res.code === 200 && res.data) {
            state.value.userInfo = res.data
            return res.data
          }
          return null
        })
        .catch(() => null)
        .finally(() => { profileRequest = null })
    }
    return profileRequest
  }

  /**
   * 是否具备某个一级菜单的权限
   * @param name 一级菜单名，如「访问统计」
   */
  const hasPerm = (name: string): boolean => isSuper.value || perms.value.includes(name)

  const clearUser = () => {
    state.value.token = ''
    state.value.username = ''
    state.value.userInfo = null
    profileRequest = null
    localStorage.removeItem('token')
    localStorage.removeItem('username')
  }

  return {
    state,
    perms,
    isSuper,
    setToken,
    setUsername,
    setUserInfo,
    ensureProfile,
    hasPerm,
    clearUser
  }
}
