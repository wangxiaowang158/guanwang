<template>
  <!-- 页脚附加信息：社交账号图标 + 友情链接，后台「基本信息 → 页脚设置」维护；都没配时整块不渲染。
       文字颜色继承页脚，两套样式通用 -->
  <div v-if="socials.length || links.length" class="fx" :class="{ 'fx--s2': style2 }">
    <ul v-if="socials.length" class="fx-socials" aria-label="关注我们">
      <li v-for="(s, i) in socials" :key="`${s.type}-${i}`" class="fx-social">
        <!-- 有主页链接：图标即链接；只有二维码：图标为按钮，点按或聚焦弹出二维码（触屏也能看） -->
        <component
          :is="s.url ? 'a' : 'button'"
          :href="s.url || undefined"
          :target="s.url ? '_blank' : undefined"
          :rel="s.url ? 'noopener noreferrer' : undefined"
          :type="s.url ? undefined : 'button'"
          class="fx-icon"
          :aria-label="s.url ? `${LABELS[s.type]}（新窗口打开）` : `${LABELS[s.type]}二维码`"
          :aria-expanded="s.url ? undefined : openIndex === i"
          :aria-describedby="s.qr && openIndex === i ? `fx-qr-${i}` : undefined"
          @click="!s.url && open(i)"
          @mouseenter="s.qr && open(i)"
          @mouseleave="close(i)"
          @focus="s.qr && open(i)"
          @blur="close(i)"
          @keydown.esc="close(i)"
        >
          <span aria-hidden="true">{{ GLYPHS[s.type] }}</span>
        </component>
        <div v-if="s.qr && openIndex === i" :id="`fx-qr-${i}`" class="fx-qr" role="tooltip">
          <img :src="s.qr" :alt="`${LABELS[s.type]}二维码`" width="120" height="120" loading="lazy" />
          <span>{{ LABELS[s.type] }}</span>
        </div>
      </li>
    </ul>
    <p v-if="links.length" class="fx-links">
      <span class="fx-links-label">友情链接</span>
      <template v-for="(l, i) in links" :key="l.url">
        <span v-if="i" class="fx-sep" aria-hidden="true">|</span>
        <a :href="l.url" target="_blank" rel="noopener noreferrer" class="fx-link">{{ l.name }}</a>
      </template>
    </p>
  </div>
</template>

<script setup lang="ts">
// 地址已由后端白名单净化（链接只放 http/https，二维码只放站内路径或 http/https），这里再过一道 safeExternalUrl
import { computed, ref } from 'vue'
import type { FooterConfig, SocialType } from '@/api/home'
import { safeExternalUrl } from '@/utils/sanitize'

const props = defineProps<{ config?: FooterConfig; style2?: boolean }>()

const LABELS: Record<SocialType, string> = {
  wechat: '微信公众号', weibo: '微博', douyin: '抖音', channels: '视频号', bilibili: '哔哩哔哩', linkedin: '领英',
}
/** 图标用单字：不引入各平台商标图形，避免版权与配色不统一 */
const GLYPHS: Record<SocialType, string> = {
  wechat: '微', weibo: '博', douyin: '抖', channels: '视', bilibili: 'B', linkedin: 'in',
}

const socials = computed(() =>
  (props.config?.socials ?? [])
    .map(s => ({ type: s.type, url: safeExternalUrl(s.url), qr: s.qr || '' }))
    .filter(s => LABELS[s.type] && (s.url || s.qr)),
)
const links = computed(() =>
  (props.config?.friendLinks ?? [])
    .map(l => ({ name: l.name, url: safeExternalUrl(l.url) }))
    .filter(l => l.name && l.url),
)

/**
 * 当前弹出二维码的账号序号，-1 为都不弹
 * 点按只打开不切换：触屏点一下会依次触发 mouseenter → focus → click，切换会让二维码一闪就收起；
 * 收起靠移开、失焦（点别处）或 Esc
 */
const openIndex = ref(-1)
const open = (i: number) => { openIndex.value = i }
const close = (i: number) => { if (openIndex.value === i) openIndex.value = -1 }
</script>

<style scoped>
.fx { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 16px 32px; margin-top: 40px; }
.fx-socials { display: flex; gap: 12px; margin: 0; padding: 0; list-style: none; }
.fx-social { position: relative; }
.fx-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  font-size: 13px;
  font-weight: 600;
  color: inherit;
  text-decoration: none;
  cursor: pointer;
  background: transparent;
  border: 1px solid currentColor;
  border-radius: 50%;
  opacity: 0.75;
  transition: opacity 0.2s ease, background 0.2s ease, color 0.2s ease;
}
.fx-icon:hover,
.fx-icon:focus-visible { opacity: 1; color: #fff; background: var(--color-brand-600); border-color: var(--color-brand-600); }
.fx--s2 .fx-icon { border-radius: 0; }
.fx--s2 .fx-icon:hover,
.fx--s2 .fx-icon:focus-visible { background: var(--rs-primary); border-color: var(--rs-primary); }
.fx-icon:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
.fx-qr {
  position: absolute;
  z-index: 10;
  bottom: calc(100% + 10px);
  left: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 10px;
  font-size: 12px;
  color: var(--color-ink-700);
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
  transform: translateX(-50%);
}
.fx--s2 .fx-qr { border-radius: 0; }
.fx-qr img { display: block; width: 120px; height: 120px; object-fit: contain; }
.fx-links { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 10px; margin: 0; font-size: 13px; }
.fx-links-label { opacity: 0.6; }
.fx-sep { opacity: 0.35; }
.fx-link { color: inherit; text-decoration: none; transition: color 0.2s ease; }
.fx-link:hover { color: #fff; }
</style>
