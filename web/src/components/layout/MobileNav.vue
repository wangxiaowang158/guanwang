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
        <RouterLink
          v-for="child in item.children"
          :key="child.key"
          :to="childTo(child)"
          class="block pl-6 pr-3 py-2.5 text-sm text-ink-500 no-underline"
          @click="$emit('navigate')"
        >{{ child.label }}</RouterLink>
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
