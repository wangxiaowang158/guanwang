import { defineConfig, loadEnv, type ProxyOptions, type UserConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import { fileURLToPath, URL } from 'node:url'
import { resolveBuildEnv, UPLOAD_URL_PREFIX } from './build/env'

export default defineConfig(({ mode }): UserConfig => {
  // 读取 .env / .env.[mode] / .env.local，仅取 VITE_ 前缀
  const env = resolveBuildEnv(loadEnv(mode, fileURLToPath(new URL('.', import.meta.url)), 'VITE_'))

  // 未指定绝对地址时，接口前缀与上传目录代理到真实后端
  const proxy: Record<string, ProxyOptions> = {}
  if (!env.apiBaseUrl) {
    proxy[env.apiPrefix] = {
      target: env.proxyTarget,
      changeOrigin: true,
    }
    // 上传文件由后端静态托管，地址不在 apiPrefix 之下，须单独代理
    proxy[UPLOAD_URL_PREFIX] = {
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
