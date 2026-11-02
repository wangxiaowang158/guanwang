import { ref, watch } from 'vue'
import { theme } from 'ant-design-vue'
import type { ThemeConfig } from 'ant-design-vue/es/config-provider/context'

const isDark = ref(localStorage.getItem('theme') === 'dark')

/** 品牌主色：与顶栏 Logo、各页面里写死的 #2f7cff 保持一致 */
export const BRAND_PRIMARY = '#2f7cff'


/** 两种主题共用的设计 token：圆角、字号、控件高度 */
const SHARED_TOKEN = {
  colorPrimary: BRAND_PRIMARY,
  colorInfo: BRAND_PRIMARY,
  colorLink: BRAND_PRIMARY,
  borderRadius: 8,
  borderRadiusLG: 12,
  borderRadiusSM: 6,
  fontSize: 14,
  controlHeight: 34,
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
}

/**
 * 菜单只调圆角与间距
 * 4.2 的颜色 token 亮暗共用一份，在这里改底色会把顶栏下拉等亮色菜单一起染深，
 * 侧栏配色因此留在 AppSidebar 的样式里单独覆盖
 */
const MENU_TOKEN = {
  radiusItem: 8,
  radiusSubMenuItem: 8,
  itemMarginInline: 10,
  menuItemHeight: 42,
}

/** 按亮暗模式组装主题配置 */
function buildTheme(dark: boolean): ThemeConfig {
  return {
    algorithm: dark ? theme.darkAlgorithm : theme.defaultAlgorithm,
    token: {
      ...SHARED_TOKEN,
      // 亮色页面底用偏冷的浅灰，白色卡片浮在上面层次更清楚
      ...(dark ? {} : { colorBgLayout: '#f3f5f9', colorBorderSecondary: '#eef0f4' }),
    },
    // 表格、弹窗在 4.2 没有开放组件 token，样式见 antd-override.scss
    components: { Menu: MENU_TOKEN },
  }
}

export function useTheme() {
  const toggleTheme = () => {
    isDark.value = !isDark.value
  }

  const themeConfig = ref<ThemeConfig>(buildTheme(isDark.value))

  watch(isDark, (val) => {
    localStorage.setItem('theme', val ? 'dark' : 'light')
    themeConfig.value = buildTheme(val)
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
