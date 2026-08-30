import { defineConfig, loadEnv, type ProxyOptions } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'node:path'
import { resolveBuildEnv, resolveRealBackendPrefixes } from './build/env'
import { annotationSavePlugin } from './build/annotation-save'

export default defineConfig(({ mode }) => {
  // 读取 .env / .env.[mode] / .env.local，仅取 VITE_ 前缀
  const env = resolveBuildEnv(loadEnv(mode, __dirname, 'VITE_'))

  // 代理规则：地图数据源固定代理；接口前缀仅在「关闭 Mock 且未指定绝对地址」时才代理到后端
  const proxy: Record<string, ProxyOptions> = {
    '/map-api': {
      target: env.mapApiTarget,
      changeOrigin: true,
      rewrite: (p) => p.replace(/^\/map-api/, ''),
    },
  }
  // 会员与反馈模块已有真实后端，其前缀无条件代理（不受 Mock 开关影响）；
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
      ...(env.enableAnnotationSave
        ? [annotationSavePlugin(path.resolve(__dirname, 'public/annotations'))]
        : []),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
      extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json', '.vue'],
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
          // 与 web 保持同一写法（函数形式），正则用括号分组避免 | 作用域跨越整个表达式
          manualChunks: (id: string) => {
            if (!id.includes('node_modules')) return
            if (/[\\/]node_modules[\\/](echarts|zrender)[\\/]/.test(id)) return 'echarts'
            // @tiptap/tiptap-markdown 补尾分隔符做目录级匹配，避免误吃同前缀的其它包；
            // prosemirror- 本身带连字符，前缀匹配即可
            if (/[\\/]node_modules[\\/](@tiptap[\\/]|tiptap-markdown[\\/]|prosemirror-)/.test(id)) return 'editor'
            if (/[\\/]node_modules[\\/](ant-design-vue|@ant-design)[\\/]/.test(id)) return 'antd'
            if (/[\\/]node_modules[\\/](vue|vue-router)[\\/]/.test(id)) return 'vue'
            if (/[\\/]node_modules[\\/](axios|dompurify|marked|sortablejs)[\\/]/.test(id)) return 'utils'
          },
        },
      },
    },
  }
})
