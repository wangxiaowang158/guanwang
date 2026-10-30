<template>
  <!-- 样式预览弹窗：三套样式的首页配色示意，供管理员对比选择 -->
  <a-modal
    :open="open"
    title="网站样式预览"
    width="960px"
    :footer="null"
    @update:open="(v: boolean) => $emit('update:open', v)"
  >
    <div class="preview-grid">
      <div v-for="item in STYLES" :key="item.key" class="preview-col" :class="{ active: current === item.key }">
        <!-- 示意图：顶栏 + 首屏 + 依次排列的板块，按该样式的板块底色顺序上色 -->
        <div class="shot" role="img" :aria-label="`${item.name}首页配色示意`">
          <div class="shot-nav"></div>
          <div class="shot-hero is-dark">
            <span class="shot-title"></span>
            <span class="shot-line"></span>
            <span class="shot-btn"></span>
          </div>
          <div v-for="(band, i) in item.bands" :key="i" class="shot-band" :class="`is-${band}`">
            <span class="shot-head"></span>
            <span class="shot-cards"><i></i><i></i><i></i></span>
          </div>
        </div>
        <div class="preview-meta">
          <div class="preview-name">{{ item.name }}</div>
          <p class="preview-desc">{{ item.desc }}</p>
          <a-button size="small" type="primary" :disabled="current === item.key" @click="$emit('apply', item.key)">
            {{ current === item.key ? '当前使用中' : '应用此样式' }}
          </a-button>
        </div>
      </div>
    </div>
  </a-modal>
</template>
<script setup lang="ts">
// 样式预览弹窗：纯展示，选择由父组件处理
// 用色块画示意而非截图：三套样式共用同一布局只在色调上区分，示意图不会随首页内容改版而过时

/** 板块底色：black 纯黑 / graphite 深灰 / white 白 / mist 浅灰 */
type Band = 'black' | 'graphite' | 'white' | 'mist'

/** bands 是首屏之后各板块的底色顺序，与前台自动交替规则一致 */
const STYLES: Array<{ key: string; name: string; desc: string; bands: Band[] }> = [
  {
    key: '1',
    name: '样式一 · 深色',
    desc: '整站深色，大标题与大图为主角，科技感最强，适合产品与技术展示。',
    bands: ['graphite', 'black', 'graphite', 'black'],
  },
  {
    key: '2',
    name: '样式二 · 浅色',
    desc: '白底与浅灰底为主，大留白、精致排版，清爽易读，适合内容较多的站点。',
    bands: ['mist', 'white', 'mist', 'white'],
  },
  {
    key: '3',
    name: '样式三 · 黑白交替',
    desc: '深色首屏，之后白底与深色板块交替出现，层次分明，兼顾质感与可读性。',
    bands: ['white', 'black', 'white', 'black'],
  },
]

defineProps<{
  open: boolean
  current: string
}>()
defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'apply', template: string): void
}>()
</script>
<style scoped>
.preview-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}
.preview-col {
  border: 1px solid #f0f0f0;
  border-radius: 10px;
  padding: 12px;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.preview-col.active {
  border-color: #1677ff;
  box-shadow: 0 0 0 2px rgba(22, 119, 255, 0.12);
}
.preview-meta {
  padding: 12px 4px 4px;
}
.preview-name {
  font-size: 14px;
  font-weight: 600;
  color: #262626;
  margin-bottom: 6px;
}
.preview-desc {
  font-size: 12px;
  line-height: 1.6;
  color: #8c8c8c;
  margin-bottom: 12px;
  min-height: 58px;
}

/* 示意图：色值与前台三套色板一致（纯黑 / 深灰 / 白 / 浅灰 + 按钮蓝） */
.shot {
  overflow: hidden;
  border: 1px solid #eee;
  border-radius: 8px;
}
.shot-nav { height: 14px; background: rgba(22, 22, 23, 0.9); }
.shot-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 28px 0 24px;
}
.shot-title { width: 60%; height: 12px; border-radius: 3px; background: #f5f5f7; }
.shot-line { width: 40%; height: 6px; border-radius: 3px; background: #86868b; }
/* 胶囊按钮，与前台主按钮同为苹果蓝 */
.shot-btn { width: 44px; height: 12px; margin-top: 4px; border-radius: 999px; background: #0071e3; }
.shot-band { padding: 16px 14px; }
.shot-head { display: block; width: 36%; height: 8px; margin: 0 auto 12px; border-radius: 3px; }
.shot-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
.shot-cards i { height: 34px; border-radius: 6px; }

.is-dark,
.is-black { background: #000; }
.is-graphite { background: #161617; }
.is-white { background: #fff; }
.is-mist { background: #f5f5f7; }
/* 深色板块：浅色标题、深灰卡片；浅色板块：深色标题、与底色错开的卡片 */
.is-black .shot-head,
.is-graphite .shot-head { background: #f5f5f7; }
.is-black .shot-cards i { background: #1d1d1f; }
.is-graphite .shot-cards i { background: #2a2a2d; }
.is-white .shot-head,
.is-mist .shot-head { background: #1d1d1f; }
.is-white .shot-cards i { background: #f5f5f7; }
.is-mist .shot-cards i { background: #fff; }
</style>
