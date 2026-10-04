import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { onAuthExpired } from './api/request'
import { useMemberStore } from './stores/member'
import './style.css'

const app = createApp(App)
app.use(createPinia())
app.use(router)

// 会员凭证在使用中途失效（过期、被停用、改密）：清掉登录态。
// 只有当前页需要登录（会员中心）才带上当前地址跳登录页，登录后可回到原页面；
// 在首页等公开页上只是静默退出，不把正在浏览的访客拽去登录页
onAuthExpired(() => {
  const member = useMemberStore()
  if (!member.isLoggedIn) return
  member.logout(false)
  const current = router.currentRoute.value
  if (!current.meta.requiresMember) return
  void router.push({ name: 'member-login', query: { redirect: current.fullPath } })
})

app.mount('#app')
