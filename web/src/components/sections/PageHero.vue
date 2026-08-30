<template>
  <!-- 栏目页通用 Hero：支持背景图配置。配图时深色蒙版 + 浅色文字；无图时浅蓝渐变 + 网格纹理 -->
  <section
    class="relative overflow-hidden pt-28 pb-16"
    :class="bg ? 'bg-cover bg-center' : 'bg-gradient-to-b from-blue-50 to-white'"
    :style="bg ? { backgroundImage: `url('${bg}')` } : undefined"
  >
    <!-- 配图时：深色渐变蒙版保证文字可读 -->
    <div v-if="bg" class="absolute inset-0 bg-gradient-to-b from-black/55 to-black/35 pointer-events-none"></div>
    <!-- 无图时：浅色网格纹理 -->
    <div v-else class="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.04)_1px,transparent_1px)] bg-[size:48px_48px] pointer-events-none"></div>

    <div class="relative max-w-7xl mx-auto px-6 lg:px-8 text-center">
      <p class="text-xs font-semibold mb-3 tracking-widest uppercase" :class="bg ? 'text-blue-200' : 'text-blue-600'">{{ eyebrow }}</p>
      <h1 class="text-4xl lg:text-5xl font-bold mb-5 leading-tight" :class="bg ? 'text-white' : 'text-gray-900'">{{ title }}</h1>
      <p class="text-base leading-relaxed max-w-3xl mx-auto" :class="bg ? 'text-gray-100' : 'text-gray-500'">{{ desc }}</p>
    </div>
  </section>
</template>

<script setup lang="ts">
// 栏目页顶部视觉区，纯展示组件；bg 为背景图地址（来自后台配置），为空时用默认浅色样式
defineProps<{
  eyebrow: string
  title: string
  desc: string
  bg?: string
}>()
</script>
