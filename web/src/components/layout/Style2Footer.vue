<template>
  <!-- 样式二页脚：集团风深色，品牌与服务热线 + 按栏目分栏 + 二维码；底栏为版权、备案号、隐私政策 -->
  <footer style="background: var(--rs-bg-dark); color: var(--rs-text-light-sub)">
    <div class="mx-auto px-6 lg:px-10 pt-16 pb-10" style="max-width: var(--rs-content-max)">
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8">
        <div class="lg:col-span-4">
          <div class="flex items-center gap-3 mb-5">
            <img v-if="footerLogo" :src="footerLogo" :alt="COMPANY_SHORT" class="h-10 w-auto max-w-[160px] object-contain" width="144" height="40" loading="lazy" />
            <template v-else>
              <span class="w-10 h-10 flex items-center justify-center text-white text-lg font-bold" style="background: var(--rs-primary)" aria-hidden="true">恒</span>
              <span class="flex flex-col leading-none">
                <span class="font-bold text-xl text-white">{{ COMPANY_SHORT }}</span>
                <span class="text-[10px] tracking-[0.25em] mt-1 text-white/50">{{ COMPANY_EN }}</span>
              </span>
            </template>
          </div>
          <p v-if="site.subSlogan" class="text-sm leading-relaxed max-w-md mb-6">{{ site.subSlogan }}</p>
          <template v-if="site.phone">
            <p class="text-xs text-white/50 mb-1">服务热线</p>
            <a :href="`tel:${site.phone}`" class="rs-foot-link block text-[28px] font-bold text-white tabular-nums no-underline">{{ site.phone }}</a>
          </template>
          <ul class="mt-5 space-y-2.5 text-sm">
            <li v-if="site.address" class="flex gap-3"><span class="text-white/50 shrink-0">地址</span>{{ site.address }}</li>
            <li v-if="site.contactEmail" class="flex gap-3">
              <span class="text-white/50 shrink-0">邮箱</span>
              <a :href="`mailto:${site.contactEmail}`" class="rs-foot-link">{{ site.contactEmail }}</a>
            </li>
          </ul>
        </div>

        <nav class="lg:col-span-6 grid grid-cols-2 sm:grid-cols-3 gap-8" aria-label="页脚导航">
          <div v-for="g in groups" :key="g.key">
            <h2 class="text-sm font-semibold text-white mb-4 tracking-wide">
              <RouterLink :to="g.path" class="rs-foot-link">{{ g.label }}</RouterLink>
            </h2>
            <ul class="space-y-2.5">
              <li v-for="c in g.children" :key="c.key">
                <RouterLink :to="childTo(c)" class="rs-foot-link text-sm">{{ c.label }}</RouterLink>
              </li>
            </ul>
          </div>
          <div v-if="others.length">
            <h2 class="text-sm font-semibold text-white mb-4 tracking-wide">更多</h2>
            <ul class="space-y-2.5">
              <li v-for="m in others" :key="m.key">
                <RouterLink :to="m.path" class="rs-foot-link text-sm">{{ m.label }}</RouterLink>
              </li>
            </ul>
          </div>
        </nav>

        <div v-if="wechatQr" class="lg:col-span-2">
          <h2 class="text-sm font-semibold text-white mb-4 tracking-wide">关注我们</h2>
          <img :src="wechatQr" alt="微信公众号二维码" class="w-28 h-28 bg-white p-1.5 object-contain" width="112" height="112" loading="lazy" />
          <p class="text-xs text-white/50 mt-2">微信扫码关注</p>
        </div>
      </div>

      <div class="mt-12 pt-6 flex flex-col md:flex-row md:justify-between md:items-center gap-3 text-[13px] border-t text-white/50" style="border-color: var(--rs-border-dark)">
        <!-- eslint-disable-next-line vue/no-v-html -- 已过 DOMPurify 净化，见 useFooterInfo -->
        <p v-if="copyrightHtml" class="rs-copyright" v-html="copyrightHtml"></p>
        <p v-else>{{ copyrightFallback }}</p>
        <div class="flex flex-wrap gap-x-5 gap-y-2">
          <a v-if="site.icpCode" href="https://beian.miit.gov.cn" target="_blank" rel="noopener noreferrer" class="rs-foot-link">{{ site.icpCode }}</a>
          <a v-if="site.policeCode" href="https://www.beian.gov.cn" target="_blank" rel="noopener noreferrer" class="rs-foot-link">{{ site.policeCode }}</a>
          <RouterLink to="/privacy" class="rs-foot-link">隐私政策</RouterLink>
        </div>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
// 样式二页脚：取值口径见 useFooterInfo，本组件只管呈现
import { COMPANY_EN, COMPANY_SHORT } from '@/config/brand'
import { useFooterInfo } from '@/composables/useFooterInfo'

const { site, wechatQr, footerLogo, copyrightHtml, copyrightFallback, groups, others, childTo } = useFooterInfo()
</script>

<style scoped>
.rs-foot-link {
  color: inherit;
  transition: color 0.2s ease;
}
.rs-foot-link:hover {
  color: #fff;
}
.rs-copyright :deep(a) {
  color: inherit;
}
.rs-copyright :deep(a:hover) {
  color: #fff;
}
</style>
