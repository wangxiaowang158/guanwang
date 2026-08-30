<template>
  <!-- 页脚：品牌简介 + 栏目导航 + 联系方式 + 备案号 + 版权，数据来自站点配置 -->
  <footer class="bg-gray-900 text-gray-400">
    <div class="max-w-7xl mx-auto px-6 lg:px-8 py-14">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-10">
        <!-- 品牌 -->
        <div class="md:col-span-2">
          <div class="flex items-center gap-2.5 mb-4">
            <div class="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white text-base font-bold">Z</div>
            <div class="flex flex-col leading-none">
              <span class="font-bold text-lg text-white">中瑞恒</span>
              <span class="text-[10px] text-gray-500 tracking-[0.2em] mt-0.5">ZRUIHENG</span>
            </div>
          </div>
          <p class="text-sm leading-relaxed max-w-sm text-gray-500">
            {{ site.subSlogan || '您身边专业的智慧能源提供商' }}。立足智慧能源领域，以数字化方式重构能源系统。
          </p>
          <!-- 联系方式 -->
          <ul class="mt-6 space-y-2 text-sm text-gray-500">
            <li v-if="site.phone" class="flex items-center gap-2">
              <span class="text-gray-600">电话</span>{{ site.phone }}
            </li>
            <li v-if="site.address" class="flex items-center gap-2">
              <span class="text-gray-600">地址</span>{{ site.address }}
            </li>
            <li v-if="site.contactEmail" class="flex items-center gap-2">
              <span class="text-gray-600">邮箱</span>{{ site.contactEmail }}
            </li>
          </ul>
        </div>

        <!-- 栏目导航 -->
        <div>
          <h4 class="text-white font-medium mb-4 text-sm">栏目导航</h4>
          <ul class="space-y-2.5">
            <li v-for="item in menu" :key="item.key">
              <RouterLink :to="item.path" class="text-gray-500 hover:text-gray-300 transition-colors text-sm no-underline">
                {{ item.label }}
              </RouterLink>
            </li>
          </ul>
        </div>

        <!-- 微信二维码占位 -->
        <div>
          <h4 class="text-white font-medium mb-4 text-sm">关注我们</h4>
          <div class="w-28 h-28 rounded-xl bg-gray-800 border border-gray-700 flex items-center justify-center overflow-hidden">
            <img v-if="wechatQr" :src="wechatQr" alt="微信二维码" class="w-full h-full object-cover" width="112" height="112" loading="lazy" />
            <span v-else class="text-xs text-gray-600">微信二维码</span>
          </div>
        </div>
      </div>
      <!-- 备案号 + 版权 -->
      <div class="border-t border-gray-800 mt-12 pt-6 flex flex-col sm:flex-row justify-between items-center gap-3 text-sm text-gray-600">
        <p>{{ site.copyright || '© 中瑞恒(北京)科技有限公司' }}</p>
        <div class="flex flex-wrap gap-4 justify-center">
          <a
            v-if="site.icpCode"
            href="https://beian.miit.gov.cn"
            target="_blank"
            rel="noopener noreferrer"
            class="hover:text-gray-400 transition-colors"
          >{{ site.icpCode }}</a>
          <a
            v-if="site.policeCode"
            href="https://www.beian.gov.cn"
            target="_blank"
            rel="noopener noreferrer"
            class="hover:text-gray-400 transition-colors"
          >{{ site.policeCode }}</a>
        </div>
      </div>
    </div>
  </footer>
</template>
<script setup lang="ts">
// 页脚：站点配置（联系方式/备案号/版权）+ 栏目导航，数据来自后台
import { computed, onMounted } from 'vue'
import type { MenuNode } from '@/api/menu'
import { useSiteStore } from '@/stores/site'

const siteStore = useSiteStore()
// 站点信息与菜单取自 site store，多组件共享同一次请求
const site = computed(() => siteStore.site)
const menu = computed<MenuNode[]>(() => siteStore.menu)

// 微信二维码：仅在配置了有效图片地址时展示
const wechatQr = computed(() => site.value.wechatQr || '')

onMounted(() => {
  // store 内部已做去重，重复调用不会产生额外请求
  siteStore.fetchSite()
  siteStore.fetchMenu()
})
</script>