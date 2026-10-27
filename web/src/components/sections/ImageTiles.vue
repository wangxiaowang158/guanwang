<template>
  <!-- 图片磁贴：整卡背景图（或静音循环视频） + 底部渐变上的标题与说明（客户价值、应用场景）；未配图的卡片用品牌深色底 -->
  <ul class="it" :class="[{ 'it--s2': style2 }, colsClass]" :style="cols ? { '--cols': cols } : undefined">
    <li v-for="item in items" :key="item.id" class="it-tile">
      <ItemLink :item="item" link-class="it-link" class="it-inner">
        <SafeMedia v-if="item.image || item.video" :image="item.image" :video="item.video" :alt="item.title" :width="480" :height="300" class="it-img" />
        <div class="it-shade" aria-hidden="true"></div>
        <div class="it-body">
          <h3 class="it-title">{{ item.title }}</h3>
          <p v-if="item.desc" class="it-desc">{{ item.desc }}</p>
        </div>
      </ItemLink>
    </li>
  </ul>
</template>

<script setup lang="ts">
// tiles 区块：每条一张磁贴；条目可点击（有正文进详情、有链接新窗口）时整卡为入口
import { computed } from 'vue'
import type { PageItem } from '@/api/page'
import SafeMedia from '@/components/common/SafeMedia.vue'
import ItemLink from './ItemLink.vue'

const props = defineProps<{
  items: PageItem[]
  style2?: boolean
  /** 电脑端每行列数，后台「区块外观」配置；缺省随条数 */
  cols?: number
}>()

// 列数：后台配了按配置；否则随条数，4 条一行四张（框架图客户价值），3 条一行三张，其余每行最多四张
const colsClass = computed(() => (props.cols ? 'it--fixed' : props.items.length === 3 ? 'it--3' : 'it--4'))
</script>

<style scoped>
.it {
  --it-radius: var(--radius-lg);
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.it--s2 { --it-radius: 0; }
@media (min-width: 1024px) {
  .it--4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  .it--3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .it--fixed { grid-template-columns: repeat(var(--cols), minmax(0, 1fr)); }
}
.it-tile { min-width: 0; }
.it-inner {
  position: relative;
  display: block;
  height: 100%;
  min-height: 200px;
  overflow: hidden;
  /* 未配图时的底色：品牌深色 + 斜向渐变，文字仍可读 */
  background: linear-gradient(135deg, var(--color-navy-950), var(--color-brand-700));
  border-radius: var(--it-radius);
}
.it--s2 .it-inner { background: linear-gradient(135deg, var(--rs-bg-dark), var(--rs-primary-dark)); }
:deep(.it-link) { display: block; height: 100%; color: inherit; text-decoration: none; }
:deep(.it-link:focus-visible) { outline: 2px solid var(--color-accent); outline-offset: 2px; }
.it-inner .it-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform var(--dur-base, 300ms);
}
.it-inner:hover .it-img { transform: scale(1.04); }
@media (prefers-reduced-motion: reduce) { .it-inner:hover .it-img { transform: none; } }
/* 底部渐变压暗，保证白字在任意照片上可读 */
.it-shade { position: absolute; inset: 0; pointer-events: none; background: linear-gradient(180deg, rgba(0, 0, 0, 0) 35%, rgba(0, 0, 0, 0.72) 100%); }
.it-body { position: absolute; left: 0; right: 0; bottom: 0; padding: 20px; }
.it-title { margin: 0; font-size: 18px; font-weight: 700; color: #fff; }
.it-desc { margin: 6px 0 0; font-size: 14px; line-height: 1.6; color: rgba(255, 255, 255, 0.85); }
</style>
