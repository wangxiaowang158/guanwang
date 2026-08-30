<template>
  <!-- 认证页外壳：极简品牌条 + 居中表单卡片，不复用官网顶栏以减少干扰 -->
  <div class="auth-shell">
    <header class="auth-bar">
      <RouterLink to="/" class="auth-brand">
        <span class="auth-logo">Z</span>
        <span class="auth-brand-text">
          <span class="auth-brand-cn">中瑞恒</span>
          <span class="auth-brand-en">ZRUIHENG</span>
        </span>
      </RouterLink>
      <RouterLink to="/" class="auth-back">返回官网</RouterLink>
    </header>

    <main class="auth-main">
      <section class="auth-card">
        <h1 class="auth-title">{{ title }}</h1>
        <p v-if="subtitle" class="auth-subtitle">{{ subtitle }}</p>
        <slot />
      </section>
      <p class="auth-foot">
        <slot name="foot" />
      </p>
    </main>
  </div>
</template>

<script setup lang="ts">
// 认证页（登录/注册/找回密码）共用外壳，统一品牌条与卡片排版
defineProps<{
  title: string
  subtitle?: string
}>()
</script>

<style scoped>
.auth-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--zrh-bg-page, #f8fafc);
}

.auth-bar {
  height: 64px;
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgba(15, 23, 42, 0.06);
  background: #fff;
}
.auth-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
}

.auth-logo {
  width: 34px;
  height: 34px;
  border-radius: 9px;
  background: var(--brand-primary, #0ea5e9);
  color: #fff;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.auth-brand-text {
  display: flex;
  flex-direction: column;
  line-height: 1.1;
}

.auth-brand-cn {
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
}

.auth-brand-en {
  font-size: 10px;
  letter-spacing: 0.2em;
  color: #94a3b8;
}

.auth-back {
  font-size: 13px;
  color: #64748b;
  text-decoration: none;
}

.auth-back:hover {
  color: var(--brand-primary, #0ea5e9);
}
.auth-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  /* 上间距大于下间距，视觉重心略高于几何中心 */
  padding: 72px 20px 48px;
}

.auth-card {
  width: 100%;
  max-width: 420px;
  padding: 36px 32px 32px;
  background: #fff;
  border: 1px solid rgba(15, 23, 42, 0.06);
  border-radius: 16px;
}

.auth-title {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  color: #0f172a;
}

.auth-subtitle {
  margin: 8px 0 0;
  font-size: 13px;
  color: #94a3b8;
}

.auth-foot {
  margin: 20px 0 0;
  font-size: 13px;
  color: #64748b;
  text-align: center;
}

@media (max-width: 480px) {
  .auth-main {
    padding: 40px 16px 32px;
  }

  .auth-card {
    padding: 28px 20px 24px;
  }
}
</style>
