<template>
  <!-- 单条证言：有配图时左图右文（窄屏上下排），无配图只显示证言 -->
  <div class="htc" :class="{ 'htc--img': usable }">
    <div v-if="usable" class="htc-media">
      <img :src="item.image" :alt="item.title" width="360" height="240" loading="lazy" @error="imgs.markBroken(item.image)" />
    </div>
    <component :is="style2 ? Style2TestimonialQuote : TestimonialQuote" :quote="quote" class="htc-quote" />
  </div>
</template>

<script setup lang="ts">
// 证言配图失效时自动退成纯文字证言；证言正文为空时 TestimonialQuote 自身不渲染
import { computed } from 'vue'
import type { TestimonyItem } from '@/api/home'
import { useBrokenImages } from '@/composables/useBrokenImages'
import TestimonialQuote from '@/components/sections/TestimonialQuote.vue'
import Style2TestimonialQuote from '@/components/sections/Style2TestimonialQuote.vue'

const props = defineProps<{ item: TestimonyItem; style2?: boolean }>()

const imgs = useBrokenImages()
const usable = computed(() => !!props.item.image && imgs.usable(props.item.image))

/** 没填署名时用条目标题兜底，让证言有出处 */
const quote = computed(() => ({
  ...props.item.quote,
  author: props.item.quote.author || props.item.title,
}))
</script>

<style scoped>
.htc { display: block; min-width: 0; padding: 0 4px; }
@media (min-width: 900px) {
  .htc--img { display: grid; grid-template-columns: 5fr 7fr; align-items: center; gap: 40px; padding: 0 56px; }
}
.htc-media { aspect-ratio: 3 / 2; overflow: hidden; margin-bottom: 20px; }
@media (min-width: 900px) {
  .htc-media { margin-bottom: 0; }
}
.htc-media img { width: 100%; height: 100%; object-fit: cover; display: block; }
.htc-quote { min-width: 0; }
</style>
