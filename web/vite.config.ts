import { defineConfig, loadEnv, type ProxyOptions, type UserConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import { fileURLToPath, URL } from 'node:url'
import { resolveBuildEnv, resolveRealBackendPrefixes } from './build/env'

export default defineConfig(({ mode }): UserConfig => {
  // 读取 .env / .env.[mode] / .env.local，仅取 VITE_ 前缀
  const env = resolveBuildEnv(loadEnv(mode, fileURLToPath(new URL('.', import.meta.url)), 'VITE_'))

  // 接口前缀仅在「关闭 Mock 且未指定绝对地址」时才代理到真实后端
  const proxy: Record<string, ProxyOptions> = {}
  // 会员相关接口已有真实后端，其前缀无条件代理（不受 Mock 开关影响）；
  // 必须先于通用 apiPrefix 注册 —— Vite 按插入顺序做前缀匹配，更具体的规则要在前
  if (!env.apiBaseUrl) {
    for (const prefix of resolveRealBackendPrefixes(env.apiPrefix)) {
      proxy[prefix] = {
        target: env.proxyTarget,
        changeOrigin: true,
      }
    }
  }
  if (!env.useMock && !env.apiBaseUrl) {
    proxy[env.apiPrefix] = {
      target: env.proxyTarget,
      changeOrigin: true,
    }
  }

  return {
    base: env.base,
    plugins: [
      vue(),
      tailwindcss(),
      AutoImport({
        resolvers: [ElementPlusResolver()],
        imports: ['vue', 'vue-router', 'pinia'],
        dts: 'src/auto-imports.d.ts',
      }),
      Components({
        resolvers: [ElementPlusResolver()],
        dts: 'src/components.d.ts',
      }),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      port: env.port,
      proxy,
    },
    preview: {
      port: env.port,
    },
    build: {
      rollupOptions: {
        output: {
          // 手动分包：把体积大且低频变动的库拆出，避免全部压进入口 chunk
          // 用函数形式而非对象形式 —— Vite 8 底层是 rolldown，只支持函数签名
          manualChunks: (id: string) => {
            if (!id.includes('node_modules')) return
            if (/[\\/]node_modules[\\/](vue|vue-router|pinia)[\\/]/.test(id)) return 'vue'
            if (/[\\/]node_modules[\\/](element-plus|@element-plus)[\\/]/.test(id)) return 'element-plus'
          },
        },
      },
    },
  }
})
