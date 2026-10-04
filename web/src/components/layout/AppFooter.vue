<template>
  <!-- 样式一页脚：品牌与服务热线 + 按栏目分栏的站内链接 + 二维码；底栏为版权、备案号、隐私政策 -->
  <footer class="bg-navy-950 text-slate-400">
    <div class="site-container pt-16 pb-10">
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8">
        <!-- 品牌与联系方式 -->
        <div class="lg:col-span-4">
          <div class="flex items-center gap-2.5 mb-5">
            <img v-if="footerLogo" :src="footerLogo" :alt="COMPANY_SHORT" class="h-9 w-auto max-w-[160px] object-contain" width="144" height="36" loading="lazy" />
            <template v-else>
              <span class="w-9 h-9 rounded-md bg-brand-600 flex items-center justify-center text-white text-base font-bold" aria-hidden="true">恒</span>
              <span class="flex flex-col leading-none">
                <span class="font-bold text-lg text-white">{{ COMPANY_SHORT }}</span>
                <span class="text-[10px] text-slate-400 tracking-[0.2em] mt-1">{{ COMPANY_EN }}</span>
              </span>
            </template>
          </div>
          <p v-if="site.subSlogan" class="text-sm leading-relaxed text-slate-300 max-w-sm mb-6">{{ site.subSlogan }}</p>

          <template v-if="site.phone">
            <p class="text-xs text-slate-400 mb-1">服务热线</p>
            <a :href="`tel:${site.phone}`" class="block text-[28px] font-bold text-white tabular-nums tracking-tight no-underline hover:text-brand-200 transition-colors">{{ site.phone }}</a>
          </template>
          <ul class="mt-5 space-y-2 text-sm text-slate-300">
            <li v-if="site.address" class="flex gap-3"><span class="text-slate-400 shrink-0">地址</span>{{ site.address }}</li>
            <li v-if="site.contactEmail" class="flex gap-3">
              <span class="text-slate-400 shrink-0">邮箱</span>
              <a :href="`mailto:${site.contactEmail}`" class="hover:text-white transition-colors">{{ site.contactEmail }}</a>
            </li>
          </ul>
        </div>

        <!-- 按栏目分栏 -->
        <nav class="lg:col-span-6 grid grid-cols-2 sm:grid-cols-3 gap-8" aria-label="页脚导航">
          <div v-for="g in groups" :key="g.key">
            <h2 class="text-sm font-semibold text-white mb-4">
              <RouterLink :to="g.path" class="hover:text-brand-200 transition-colors">{{ g.label }}</RouterLink>
            </h2>
            <ul class="space-y-2.5">
              <li v-for="c in g.children" :key="c.key">
                <RouterLink :to="childTo(c)" class="text-sm text-slate-400 hover:text-white transition-colors">{{ c.label }}</RouterLink>
              </li>
            </ul>
          </div>
          <div v-if="others.length">
            <h2 class="text-sm font-semibold text-white mb-4">更多</h2>
            <ul class="space-y-2.5">
              <li v-for="m in others" :key="m.key">
                <RouterLink :to="m.path" class="text-sm text-slate-400 hover:text-white transition-colors">{{ m.label }}</RouterLink>
              </li>
            </ul>
          </div>
        </nav>

        <!-- 二维码：未配置时整块不显示 -->
        <div v-if="wechatQr" class="lg:col-span-2">
          <h2 class="text-sm font-semibold text-white mb-4">关注我们</h2>
          <img :src="wechatQr" alt="微信公众号二维码" class="w-28 h-28 rounded-md bg-white p-1.5 object-contain" width="112" height="112" loading="lazy" />
          <p class="text-xs text-slate-400 mt-2">微信扫码关注</p>
        </div>
      </div>

      <div class="border-t border-white/10 mt-12 pt-6 flex flex-col md:flex-row md:justify-between md:items-center gap-3 text-[13px] text-slate-400">
        <!-- eslint-disable-next-line vue/no-v-html -- 已过 DOMPurify 净化，见 useFooterInfo -->
        <p v-if="copyrightHtml" class="footer-copyright" v-html="copyrightHtml"></p>
        <p v-else>{{ copyrightFallback }}</p>
        <div class="flex flex-wrap gap-x-5 gap-y-2">
          <a v-if="site.icpCode" href="https://beian.miit.gov.cn" target="_blank" rel="noopener noreferrer" class="hover:text-white transition-colors">{{ site.icpCode }}</a>
          <a v-if="site.policeCode" href="https://www.beian.gov.cn" target="_blank" rel="noopener noreferrer" class="hover:text-white transition-colors">{{ site.policeCode }}</a>
          <RouterLink to="/privacy" class="hover:text-white transition-colors">隐私政策</RouterLink>
        </div>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
// 样式一页脚：取值口径见 useFooterInfo，本组件只管呈现
import { COMPANY_EN, COMPANY_SHORT } from '@/config/brand'
import { useFooterInfo } from '@/composables/useFooterInfo'

const { site, wechatQr, footerLogo, copyrightHtml, copyrightFallback, groups, others, childTo } = useFooterInfo()
</script>

<style scoped>
/* 版权信息为后台富文本，内含链接时沿用页脚的链接色 */
.footer-copyright :deep(a) {
  color: inherit;
  transition: color var(--dur-fast);
}
.footer-copyright :deep(a:hover) {
  color: #fff;
}
</style>
