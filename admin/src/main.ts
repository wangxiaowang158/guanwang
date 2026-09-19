import { createApp } from 'vue'
import Antd from 'ant-design-vue'
import 'ant-design-vue/dist/reset.css'
import '@/assets/styles/reset.scss'
import '@/assets/styles/antd-override.scss'
import '@/assets/styles/sidebar.scss'
import '@/assets/styles/global.scss'

import App from './App.vue'
import router from './router'
import { setupAxios } from '@/utils/request'

// 安装 axios 基础地址与拦截器（注入凭证 + 鉴权失效处理）
setupAxios()

const app = createApp(App)
app.use(Antd)
app.use(router)
app.mount('#app')
