<template>
  <!-- 顶栏搜索入口：只放图标链接、不放输入框——顶栏定宽，导航 + 会员 + 咨询已基本占满 -->
  <RouterLink to="/search" class="search-entry" aria-label="站内搜索" title="站内搜索">
    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="11" cy="11" r="7" stroke-width="1.8" />
      <path stroke-linecap="round" stroke-width="1.8" d="M20 20l-3.5-3.5" />
    </svg>
  </RouterLink>
</template>

<style scoped>
.search-entry {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  transition: opacity var(--dur-fast) ease;
}
.search-entry:hover {
  opacity: 0.7;
}
</style>
