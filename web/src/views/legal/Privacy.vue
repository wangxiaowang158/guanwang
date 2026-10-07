<template>
  <!-- 隐私政策：官网收集个人信息（在线留言、会员注册）的告知页，页脚常驻入口 -->
  <!-- 顶部留白需大于固定顶栏高度（样式二 76px），否则当前位置会被顶栏压住；本页无头图兜不住这段 -->
  <div class="bg-white">
    <div class="max-w-3xl mx-auto px-6 lg:px-8 pt-[116px] pb-16 md:pb-24">
      <nav class="flex items-center gap-2 text-[13px] text-ink-500 mb-8" aria-label="当前位置">
        <RouterLink to="/" class="hover:text-brand-600 transition-colors">首页</RouterLink>
        <span aria-hidden="true">/</span>
        <span aria-current="page" class="text-ink-700">隐私政策</span>
      </nav>

      <header class="pb-6 border-b border-line">
        <h1 class="text-[32px] font-bold text-ink-900">隐私政策</h1>
        <p class="mt-3 text-sm text-ink-500">最近更新：{{ UPDATED_AT }}</p>
      </header>

      <div class="privacy-body mt-8 space-y-8 text-[15px] md:text-base leading-loose text-ink-700">
        <section>
          <p>
            {{ companyName }}（以下称"我们"）尊重并保护访问者的个人信息。本政策说明我们在本网站收集哪些个人信息、
            如何使用与保存，以及您享有的权利。请您在提交任何个人信息前阅读本政策。
          </p>
        </section>

        <section>
          <h2 class="text-base font-semibold text-gray-900 mb-2">一、我们收集的信息</h2>
          <p>我们仅在您主动填写时收集以下信息，不会强制要求您提供与业务无关的个人信息：</p>
          <ul class="mt-2 space-y-1.5 list-disc pl-5">
            <li><strong class="font-medium text-gray-700">在线留言</strong>：姓名、手机号、留言内容。</li>
            <li>
              <strong class="font-medium text-gray-700">会员注册</strong>：手机号、密码（加密存储，我们无法还原明文）、昵称；
              以及您选填的邮箱，仅用于接收反馈处理通知，可随时在会员中心修改或清空。
            </li>
            <li>
              <strong class="font-medium text-gray-700">访问日志</strong>：访问页面、访问时间、IP 地址。
              该类信息用于统计栏目访问量与排查故障，不与您的身份信息关联。
            </li>
          </ul>
        </section>

        <section>
          <h2 class="text-base font-semibold text-gray-900 mb-2">二、我们如何使用这些信息</h2>
          <ul class="space-y-1.5 list-disc pl-5">
            <li>联系您并回应您的业务咨询与需求，这是我们收集姓名与手机号的唯一目的。</li>
            <li>向您提供会员服务，包括查看您提交的反馈及我们的回复。</li>
            <li>统计网站访问情况，用于改进内容与页面体验。</li>
          </ul>
          <p class="mt-2">
            我们不会将您的个人信息用于上述目的之外的用途。如需变更使用目的，我们会重新征得您的同意。
          </p>
        </section>

        <section>
          <h2 class="text-base font-semibold text-gray-900 mb-2">三、信息的共享与对外提供</h2>
          <p>
            我们不出售、不出租您的个人信息。除以下情形外，我们不会向第三方提供您的个人信息：
          </p>
          <ul class="mt-2 space-y-1.5 list-disc pl-5">
            <li>事先取得您的明确同意。</li>
            <li>依照法律法规规定，或应行政、司法机关的法定要求。</li>
          </ul>
        </section>

        <section>
          <h2 class="text-base font-semibold text-gray-900 mb-2">四、信息的保存与安全</h2>
          <p>
            您的信息存储于中国境内的服务器。我们采取传输加密、访问权限控制等措施保护您的信息安全。
            个人信息的保存期限为实现上述目的所必需的最短时间；超出保存期限后，我们将删除或匿名化处理。
          </p>
        </section>

        <section>
          <h2 class="text-base font-semibold text-gray-900 mb-2">五、您的权利</h2>
          <p>
            根据《中华人民共和国个人信息保护法》，您有权查阅、复制、更正、补充您的个人信息，
            有权撤回您的同意，也有权要求删除您的个人信息。您可通过下方联系方式向我们提出请求，
            我们将在核实您的身份后及时处理。
          </p>
        </section>

        <section>
          <h2 class="text-base font-semibold text-gray-900 mb-2">六、未成年人信息</h2>
          <p>
            本网站面向企业客户提供业务信息，不主动面向未成年人收集个人信息。
            若您是未满 14 周岁的儿童，请在监护人陪同下阅读本政策，并在监护人同意后再提交任何个人信息。
          </p>
        </section>

        <section>
          <h2 class="text-base font-semibold text-gray-900 mb-2">七、联系我们</h2>
          <p>
            如您对本政策有任何疑问，或需行使上述权利，可通过以下方式联系我们：
          </p>
          <ul class="mt-2 space-y-1.5">
            <li v-if="site.phone">电话：{{ site.phone }}</li>
            <li v-if="site.contactEmail">邮箱：{{ site.contactEmail }}</li>
            <li v-if="site.address">地址：{{ site.address }}</li>
          </ul>
        </section>

        <section class="pt-6 border-t border-gray-100">
          <h2 class="text-base font-semibold text-gray-900 mb-2">八、本政策的更新</h2>
          <p>
            我们可能适时修订本政策。修订后的政策将在本页面公布，涉及您权利的重大变更我们会另行提示。
          </p>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// 隐私政策页：正文为系统内置条款，主体名称固定，联系方式取自基本信息管理（未填写的项不展示）
import { computed, onMounted } from 'vue'
import { useSiteStore } from '@/stores/site'
import { COMPANY_NAME } from '@/config/brand'

defineOptions({ name: 'PrivacyPage' })

/** 条款最近更新日期，修改正文时须同步此处 */
const UPDATED_AT = '2026 年 10 月 2 日'

const siteStore = useSiteStore()
const site = computed(() => siteStore.site)
// 主体名称固定（SRS 3.5.1）：原先从版权字段里截取，版权里带地址与备案号时会整段变成「公司名」
const companyName = COMPANY_NAME

onMounted(() => {
  // store 内部已做去重，重复调用不会产生额外请求
  siteStore.fetchSite()
})
</script>

<style scoped>
/* 条款小标题与强调词统一走正文深色 token（原先散落 gray-900 / gray-700） */
.privacy-body :deep(h2) {
  font-size: 18px;
  color: var(--color-ink-900);
}
.privacy-body :deep(strong) {
  color: var(--color-ink-900);
}
</style>
