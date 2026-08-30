import { ref, watch } from 'vue'
import { theme } from 'ant-design-vue'

const isDark = ref(localStorage.getItem('theme') === 'dark')

export function useTheme() {
  const toggleTheme = () => {
    isDark.value = !isDark.value
  }

  const themeConfig = ref({
    algorithm: isDark.value ? theme.darkAlgorithm : theme.defaultAlgorithm
  })

  watch(isDark, (val) => {
    localStorage.setItem('theme', val ? 'dark' : 'light')
    themeConfig.value = {
      algorithm: val ? theme.darkAlgorithm : theme.defaultAlgorithm
    }
    if (val) {
      document.body.classList.add('dark-theme')
    } else {
      document.body.classList.remove('dark-theme')
    }
  }, { immediate: true })

  return {
    isDark,
    toggleTheme,
    themeConfig
  }
}
