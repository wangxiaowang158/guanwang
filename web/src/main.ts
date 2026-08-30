import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { setupMock } from './mock/setup'
import './style.css'

// 异步启动：Mock 注册完成后再挂载应用，避免首个请求漏拦截
async function bootstrap() {
  // Mock 开关由 .env 的 VITE_USE_MOCK 控制（见 src/config）
  await setupMock()

  const app = createApp(App)
  app.use(createPinia())
  app.use(router)
  app.mount('#app')
}

bootstrap()
