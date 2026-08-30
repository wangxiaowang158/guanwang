import { ref } from 'vue'

interface UserState {
  token: string
  username: string
  userInfo: any
}

const state = ref<UserState>({
  token: localStorage.getItem('token') || '',
  username: localStorage.getItem('username') || '',
  userInfo: null
})

export const useUserStore = () => {
  const setToken = (token: string) => {
    state.value.token = token
    localStorage.setItem('token', token)
  }

  const setUsername = (username: string) => {
    state.value.username = username
    localStorage.setItem('username', username)
  }

  const setUserInfo = (userInfo: any) => {
    state.value.userInfo = userInfo
  }

  const clearUser = () => {
    state.value.token = ''
    state.value.username = ''
    state.value.userInfo = null
    localStorage.removeItem('token')
    localStorage.removeItem('username')
  }

  return {
    state,
    setToken,
    setUsername,
    setUserInfo,
    clearUser
  }
}
