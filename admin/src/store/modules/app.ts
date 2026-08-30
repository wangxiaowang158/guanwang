import { ref } from 'vue'

interface AppState {
  collapsed: boolean
  theme: 'light' | 'dark'
}

const state = ref<AppState>({
  collapsed: false,
  theme: (localStorage.getItem('theme') as 'light' | 'dark') || 'light'
})

export const useAppStore = () => {
  const setCollapsed = (collapsed: boolean) => {
    state.value.collapsed = collapsed
  }

  const toggleCollapsed = () => {
    state.value.collapsed = !state.value.collapsed
  }

  const setTheme = (theme: 'light' | 'dark') => {
    state.value.theme = theme
    localStorage.setItem('theme', theme)
  }

  return {
    state,
    setCollapsed,
    toggleCollapsed,
    setTheme
  }
}
