<template>
  <!-- 样式二页脚：集团风深色大气，多栏信息 + 红色点缀 -->
  <footer style="background: var(--rs-bg-dark); color: var(--rs-text-light-sub)">
    <div class="mx-auto px-6 lg:px-10 py-16" style="max-width: var(--rs-content-max)">
      <div class="grid grid-cols-1 md:grid-cols-12 gap-10">
        <!-- 品牌 -->
        <div class="md:col-span-5">
          <div class="flex items-center gap-3 mb-5">
            <div class="w-10 h-10 flex items-center justify-center text-white text-lg font-bold" style="background: var(--rs-primary)">Z</div>
            <div class="flex flex-col leading-none">
              <span class="font-bold text-xl text-white">中瑞恒集团</span>
              <span class="text-[10px] tracking-[0.25em] mt-1" style="color: var(--rs-text-muted)">ZRUIHENG GROUP</span>
            </div>
          </div>
          <p class="text-sm leading-relaxed max-w-md" style="color: var(--rs-text-light-sub)">
            {{ site.subSlogan || '您身边专业的智慧能源提供商' }}。立足智慧能源领域，以数字化方式重构能源系统，推动能源产业数智化转型。
          </p>
          <ul class="mt-6 space-y-2.5 text-sm" style="color: var(--rs-text-light-sub)">
            <li v-if="site.phone" class="flex items-center gap-3">
              <span style="color: var(--rs-text-muted)">电话</span>{{ site.phone }}
            </li>
            <li v-if="site.address" class="flex items-center gap-3">
              <span style="color: var(--rs-text-muted)">地址</span>{{ site.address }}
            </li>
            <li v-if="site.contactEmail" class="flex items-center gap-3">
              <span style="color: var(--rs-text-muted)">邮箱</span>{{ site.contactEmail }}
            </li>
          </ul>
        </div>

        <!-- 栏目导航 -->
        <div class="md:col-span-4">
          <h4 class="text-white font-medium mb-5 text-sm tracking-wide">业务导航</h4>
          <ul class="grid grid-cols-2 gap-y-3 gap-x-4">
            <li v-for="item in menu" :key="item.key">
              <RouterLink :to="item.path" class="text-sm no-underline rs-foot-link" style="color: var(--rs-text-light-sub)">
                {{ item.label }}
              </RouterLink>
            </li>
          </ul>
        </div>
        <div class="md:col-span-3">
          <h4 class="text-white font-medium mb-5 text-sm tracking-wide">关注我们</h4>
          <div class="w-28 h-28 bg-white/5 border flex items-center justify-center overflow-hidden" style="border-color: var(--rs-border-dark)">
            <img v-if="wechatQr" :src="wechatQr" alt="微信二维码" class="w-full h-full object-cover" width="112" height="112" loading="lazy" />
            <span v-else class="text-xs" style="color: var(--rs-text-muted)">微信二维码</span>
          </div>
        </div>
      </div>
      <div class="mt-12 pt-6 flex flex-col sm:flex-row justify-between items-center gap-3 text-sm border-t" style="border-color: var(--rs-border-dark); color: var(--rs-text-muted)">
        <p>{{ site.copyright || '© 中瑞恒(北京)科技有限公司' }}</p>
        <div class="flex flex-wrap gap-4 justify-center">
          <a v-if="site.icpCode" href="https://beian.miit.gov.cn" target="_blank" rel="noopener noreferrer" class="rs-foot-link" style="color: var(--rs-text-muted)">{{ site.icpCode }}</a>
          <a v-if="site.policeCode" href="https://www.beian.gov.cn" target="_blank" rel="noopener noreferrer" class="rs-foot-link" style="color: var(--rs-text-muted)">{{ site.policeCode }}</a>
        </div>
      </div>
    </div>
  </footer>
</template>
<script setup lang="ts">
// 样式二页脚：站点配置 + 栏目导航，数据来自后台
import { computed, onMounted } from 'vue'
import type { MenuNode } from '@/api/menu'
import { useSiteStore } from '@/stores/site'

const siteStore = useSiteStore()
// 站点信息与菜单取自 site store，多组件共享同一次请求
const site = computed(() => siteStore.site)
const menu = computed<MenuNode[]>(() => siteStore.menu)

const wechatQr = computed(() => site.value.wechatQr || '')

onMounted(() => {
  // store 内部已做去重，重复调用不会产生额外请求
  siteStore.fetchSite()
  siteStore.fetchMenu()
})
</script>

<style scoped>
.rs-foot-link {
  transition: color 0.2s ease;
}
.rs-foot-link:hover {
  color: #fff;
}
</style>
