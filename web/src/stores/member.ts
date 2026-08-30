import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { fetchProfile } from '@/api/member'
import type { MemberProfile } from '@/api/memberAuth'
import { MEMBER_TOKEN_KEY, REAL_API_SUCCESS_CODE } from '@/config'

/**
 * 会员 store —— 全局共享会员登录态与资料
 *
 * 令牌持久化在 localStorage，刷新页面后由 restore() 用令牌换回资料；
 * 令牌失效（后端返回 401）时自动清空本地登录态，避免头部一直显示已登录。
 */
export const useMemberStore = defineStore('member', () => {
  const token = ref<string>(localStorage.getItem(MEMBER_TOKEN_KEY) || '')
  const profile = ref<MemberProfile | null>(null)
  // 标记 restore 是否已跑完，路由守卫据此决定是否等待
  const restored = ref(false)

  const isLoggedIn = computed(() => !!token.value)
  /** 头部展示名；资料未回来时先占位，避免抖动 */
  const displayName = computed(() => profile.value?.nickname || '会员')

  // 进行中的 restore，用于合并并发调用（头部与路由守卫可能同时触发）
  let restorePending: Promise<void> | null = null

  /** 写入登录态：令牌落盘，资料存内存 */
  function setAuth(newToken: string, newProfile: MemberProfile): void {
    token.value = newToken
    profile.value = newProfile
    restored.value = true
    localStorage.setItem(MEMBER_TOKEN_KEY, newToken)
  }

  /** 仅更新资料（资料编辑、改昵称头像后调用） */
  function setProfile(next: MemberProfile): void {
    profile.value = next
  }

  /** 清空登录态并清除本地令牌 */
  function logout(): void {
    token.value = ''
    profile.value = null
    restored.value = true
    localStorage.removeItem(MEMBER_TOKEN_KEY)
  }

  /**
   * 用本地令牌恢复登录态（幂等）
   * 无令牌或已有资料时直接返回；令牌失效则清空登录态；
   * 网络异常保留令牌，避免断网时把用户踢下线
   */
  async function restore(): Promise<void> {
    if (restored.value && (profile.value || !token.value)) return
    if (restorePending) return restorePending
    if (!token.value) {
      restored.value = true
      return
    }

    restorePending = (async () => {
      try {
        const res = await fetchProfile()
        if (res.code === REAL_API_SUCCESS_CODE && res.data) {
          profile.value = res.data
        } else {
          // 令牌已失效（过期或会员被禁用），清空登录态
          logout()
        }
      } catch {
        // 网络层失败不动令牌，下次进入再试
      } finally {
        restored.value = true
        restorePending = null
      }
    })()

    return restorePending
  }

  return { token, profile, restored, isLoggedIn, displayName, setAuth, setProfile, logout, restore }
})
