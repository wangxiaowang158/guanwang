<template>
  <!-- 首页战略合作：按分类（产业伙伴 / 科创伙伴 / 合作伙伴）分组，每组一行 Logo 墙；
       有 Logo 显示 Logo，挂了或未上传显示名称；未填分类的归入「合作伙伴」；无数据整块不渲染 -->
  <HomeBlock v-if="items.length" id="partner" :eyebrow="eyebrow || '战略合作'" :title="title || '产业伙伴 · 科创伙伴 · 合作伙伴'" :style2="style2" :tone="tone || 'surface'">
    <div class="hp-groups">
      <section v-for="g in groups" :key="g.name" class="hp-group">
        <h3 class="hp-group-title" :class="{ 'hp-group-title--s2': style2 }">{{ g.name }}</h3>
        <ul class="hp-grid">
          <li v-for="p in g.items" :key="p.id">
            <component
              :is="safeExternalUrl(p.link) ? 'a' : 'div'"
              :href="safeExternalUrl(p.link) || undefined"
              :target="safeExternalUrl(p.link) ? '_blank' : undefined"
              :rel="safeExternalUrl(p.link) ? 'noopener noreferrer' : undefined"
              class="hp-item"
              :class="{ 'hp-item--s2': style2 }"
            >
              <img v-if="imgs.usable(p.logo)" :src="p.logo" :alt="p.name" class="hp-logo" width="140" height="48" loading="lazy" @error="imgs.markBroken(p.logo)" />
              <span v-else>{{ p.name }}</span>
            </component>
          </li>
        </ul>
      </section>
    </div>
  </HomeBlock>
</template>

<script setup lang="ts">
// 首页战略合作，后台「首页 → 战略合作」维护，「分类」填分组名
import { computed } from 'vue'
import type { PartnerItem } from '@/api/home'
import { safeExternalUrl } from '@/utils/sanitize'
import { useBrokenImages } from '@/composables/useBrokenImages'
import HomeBlock from './HomeBlock.vue'

const props = defineProps<{
  items: PartnerItem[]
  eyebrow?: string
  title?: string
  style2?: boolean
  /** 板块底色（白 / 浅色），后台首页布局决定；缺省为模板默认 */
  tone?: 'white' | 'surface'
}>()

/** 框架图里的三组顺序；后台填了别的分组名时排在这三组之后 */
const GROUP_ORDER = ['产业伙伴', '科创伙伴', '合作伙伴']
/** 未填分类时归入的分组 */
const DEFAULT_GROUP = '合作伙伴'

const groups = computed(() => {
  const map = new Map<string, PartnerItem[]>()
  for (const p of props.items) {
    const name = p.category?.trim() || DEFAULT_GROUP
    map.set(name, [...(map.get(name) ?? []), p])
  }
  const rank = (n: string) => (GROUP_ORDER.includes(n) ? GROUP_ORDER.indexOf(n) : GROUP_ORDER.length)
  return [...map.entries()]
    .sort(([a], [b]) => rank(a) - rank(b))
    .map(([name, items]) => ({ name, items }))
})

// Logo 加载失败回退为名称，不显示破图
const imgs = useBrokenImages()
</script>

<style scoped>
.hp-groups { display: flex; flex-direction: column; gap: 40px; }
.hp-group-title {
  margin: 0 0 16px;
  padding-left: 12px;
  font-size: 18px;
  font-weight: 700;
  color: var(--color-ink-900);
  border-left: 3px solid var(--color-brand-600);
}
.hp-group-title--s2 { border-left-color: var(--rs-primary); }
.hp-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin: 0; padding: 0; list-style: none; }
@media (min-width: 768px) { .hp-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
@media (min-width: 1200px) { .hp-grid { grid-template-columns: repeat(6, minmax(0, 1fr)); } }
.hp-item {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 80px;
  padding: 12px;
  font-size: 14px;
  color: var(--color-ink-700);
  text-align: center;
  background: #fff;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-md);
}
.hp-item--s2 { border-radius: 0; }
a.hp-item:hover { border-color: var(--color-brand-600); }
a.hp-item:focus-visible { outline: 2px solid var(--color-brand-600); outline-offset: 2px; }
.hp-logo { max-width: 100%; max-height: 48px; object-fit: contain; }
</style>
