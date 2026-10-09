<template>
  <!-- 移动端导航抽屉：两套顶栏共用，颜色跟随 --nav-accent（由父级设置） -->
  <nav class="mobile-nav lg:hidden" aria-label="移动端导航">
    <div v-for="item in menu" :key="item.key" class="mobile-item">
      <div class="flex items-center justify-between">
        <RouterLink
          :to="item.path"
          class="flex-1 px-3 py-3.5 text-[15px] no-underline"
          :class="isActive(item) ? 'mobile-link--active' : 'text-ink-700'"
          :aria-current="isActive(item) ? 'page' : undefined"
          @click="$emit('navigate')"
        >{{ item.label }}</RouterLink>
        <button
          v-if="item.children?.length"
          type="button"
          class="p-3 text-ink-500"
          :aria-label="`${expandedKey === item.key ? '收起' : '展开'}${item.label}子菜单`"
          :aria-expanded="expandedKey === item.key"
          @click="$emit('update:expandedKey', expandedKey === item.key ? '' : item.key)"
        >
          <svg class="w-4 h-4 transition-transform" :class="expandedKey === item.key ? 'rotate-180' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
      <div v-if="item.children?.length && expandedKey === item.key" class="pb-2">
        <!-- 子项带分组：先列分组标题，再列该组子项并显示说明 -->
        <template v-if="groupChildren(item.children)">
          <section v-for="g in groupChildren(item.children)" :key="g.title" class="mobile-group">
            <p v-if="g.title" class="mobile-group-title">{{ g.title }}</p>
            <RouterLink
              v-for="child in g.items"
              :key="child.key"
              :to="childTo(child)"
              class="block pl-6 pr-3 py-2.5 text-sm text-ink-700 no-underline"
              @click="$emit('navigate')"
            >
              {{ child.label }}
              <span v-if="child.desc" class="mobile-desc">{{ child.desc }}</span>
            </RouterLink>
          </section>
        </template>
        <!-- 无分组：保持原有单列 -->
        <template v-else>
          <RouterLink
            v-for="child in item.children"
            :key="child.key"
            :to="childTo(child)"
            class="block pl-6 pr-3 py-2.5 text-sm text-ink-500 no-underline"
            @click="$emit('navigate')"
          >{{ child.label }}</RouterLink>
        </template>
      </div>
    </div>
    <MemberEntry class="mt-3 justify-center py-2 text-ink-700" />
    <a v-if="phone" :href="`tel:${phone}`" class="mobile-call">
      <PhoneIcon class="w-4 h-4" />
      {{ phone }}
    </a>
  </nav>
</template>

<script setup lang="ts">
// 移动端抽屉菜单，纯展示：展开状态由父级持有（v-model:expanded-key）
import type { MenuNode } from '@/api/menu'
import { groupChildren } from '@/composables/useHeaderNav'
import MemberEntry from './MemberEntry.vue'
import PhoneIcon from './PhoneIcon.vue'

defineProps<{
  menu: MenuNode[]
  phone: string
  expandedKey: string
  isActive: (item: MenuNode) => boolean
  childTo: (child: MenuNode) => string
}>()

defineEmits<{
  navigate: []
  'update:expandedKey': [key: string]
}>()
</script>

<style scoped>
.mobile-nav {
  max-height: calc(100svh - var(--nav-h));
  overflow-y: auto;
  padding: 8px 16px 20px;
  background: #fff;
  border-top: 1px solid var(--color-line);
}
.mobile-item { border-bottom: 1px solid var(--color-line); }
.mobile-group-title {
  margin: 8px 0 2px;
  padding: 0 12px 0 24px;
  font-size: 12px;
  font-weight: 600;
  color: var(--color-ink-500);
}
.mobile-desc { display: block; margin-top: 2px; font-size: 12px; line-height: 1.5; color: var(--color-ink-500); }
.mobile-link--active {
  color: var(--nav-accent, var(--color-brand-600));
  font-weight: 600;
}
.mobile-call {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 12px;
  height: 44px;
  color: #fff;
  font-size: 15px;
  font-weight: 500;
  background: var(--nav-accent, var(--color-brand-600));
  border-radius: var(--nav-radius, var(--radius-md));
}
</style>
