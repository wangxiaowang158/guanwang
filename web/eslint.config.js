// ESLint 扁平配置 —— 前台官网（Vue 3 + TypeScript）
// Vue 用 essential 预设（只查正确性，不强加格式风格）+ TS 官方推荐规则；不额外关闭规则，报错一律修代码
import pluginVue from 'eslint-plugin-vue'
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'

export default defineConfigWithVueTs(
  { ignores: ['dist/**', 'node_modules/**', '**/*.d.ts'] },
  pluginVue.configs['flat/essential'],
  vueTsConfigs.recommended,
)
