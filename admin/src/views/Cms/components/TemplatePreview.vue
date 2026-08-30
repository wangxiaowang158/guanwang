<template>
  <!-- 样式预览弹窗：用各自设计 token 渲染两套样式的示意缩略图，供管理员对比选择 -->
  <a-modal
    :open="open"
    title="网站样式预览"
    width="900px"
    :footer="null"
    @update:open="(v: boolean) => $emit('update:open', v)"
  >
    <div class="preview-grid">
      <!-- 样式一：深蓝科技风 -->
      <div class="preview-col" :class="{ active: current === '1' }">
        <div class="mock mock-s1">
          <div class="mock-nav">
            <span class="mock-logo s1">中</span>
            <span class="mock-navitem"></span>
            <span class="mock-navitem"></span>
            <span class="mock-navitem"></span>
            <span class="mock-cta s1"></span>
          </div>
          <div class="mock-hero s1">
            <div class="mock-line s1-accent w60"></div>
            <div class="mock-line dark w80 tall"></div>
            <div class="mock-line dark w50 tall"></div>
            <div class="mock-line gray w70"></div>
            <div class="mock-btns">
              <span class="mock-btn s1"></span>
              <span class="mock-btn ghost"></span>
            </div>
          </div>
          <div class="mock-cards">
            <div class="mock-card s1"></div>
            <div class="mock-card s1"></div>
            <div class="mock-card s1"></div>
          </div>
        </div>
        <div class="preview-meta">
          <div class="preview-name">样式一 · 深蓝科技风</div>
          <p class="preview-desc">浅色清爽、蓝色科技感，居中标题 + 卡片网格，适合产品/技术型展示。</p>
          <a-button size="small" type="primary" :disabled="current === '1'" @click="$emit('apply', '1')">
            {{ current === '1' ? '当前使用中' : '应用此样式' }}
          </a-button>
        </div>
      </div>
      <!-- PREVIEW_S2 -->
      <!-- 样式二：集团品牌风 -->
      <div class="preview-col" :class="{ active: current === '2' }">
        <div class="mock mock-s2">
          <div class="mock-nav light">
            <span class="mock-logo s2">中</span>
            <span class="mock-navitem dark"></span>
            <span class="mock-navitem dark"></span>
            <span class="mock-navitem dark"></span>
            <span class="mock-cta s2"></span>
          </div>
          <div class="mock-hero s2">
            <div class="mock-line s2-accent w40"></div>
            <div class="mock-line light w70 tall"></div>
            <div class="mock-line light w50 tall"></div>
            <div class="mock-line lightgray w60"></div>
            <div class="mock-btns">
              <span class="mock-btn s2"></span>
              <span class="mock-btn ghost-light"></span>
            </div>
            <div class="mock-statbar">
              <span></span><span></span><span></span><span></span>
            </div>
          </div>
          <div class="mock-cards tight">
            <div class="mock-card s2"><i></i></div>
            <div class="mock-card s2"><i></i></div>
            <div class="mock-card s2"><i></i></div>
          </div>
        </div>
        <div class="preview-meta">
          <div class="preview-name">样式二 · 集团品牌风</div>
          <p class="preview-desc">满屏深色大图、编辑式左对齐排版、红色点缀，业务编号陈列，适合集团品牌形象。</p>
          <a-button size="small" type="primary" :disabled="current === '2'" @click="$emit('apply', '2')">
            {{ current === '2' ? '当前使用中' : '应用此样式' }}
          </a-button>
        </div>
      </div>
    </div>
  </a-modal>
</template>
<script setup lang="ts">
// 样式预览弹窗：纯展示，渲染两套模板示意图；选择由父组件处理
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
  grid-template-columns: 1fr 1fr;
  gap: 20px;
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
  min-height: 38px;
}
/* 缩略图外框 */
.mock {
  height: 240px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #eee;
}
/* 顶栏 */
.mock-nav {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 9px 12px;
  background: rgba(255, 255, 255, 0.85);
}
.mock-nav.light {
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
}
.mock-logo {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  color: #fff;
  font-size: 9px;
  line-height: 16px;
  text-align: center;
  font-weight: 700;
  flex-shrink: 0;
}
.mock-logo.s1 { background: #1a7fd4; }
.mock-logo.s2 { background: #c8161d; }
.mock-navitem {
  width: 22px;
  height: 5px;
  border-radius: 3px;
  background: #c9d6e3;
}
.mock-navitem.dark { background: #d0d0d0; }
.mock-cta {
  width: 30px;
  height: 12px;
  border-radius: 3px;
  margin-left: auto;
}
.mock-cta.s1 { background: #1a7fd4; }
.mock-cta.s2 { background: #c8161d; }
/* MOCK_HERO_CSS */
/* Hero 区 */
.mock-hero {
  padding: 16px 14px;
}
.mock-hero.s1 {
  background: linear-gradient(180deg, #eef4fc 0%, #fff 100%);
  text-align: center;
}
.mock-hero.s1 .mock-line { margin-left: auto; margin-right: auto; }
.mock-hero.s1 .mock-btns { justify-content: center; }
.mock-hero.s2 {
  background: linear-gradient(120deg, #1a1a1a 0%, #2a1416 60%, #3a161a 100%);
  text-align: left;
  position: relative;
}
.mock-line {
  height: 6px;
  border-radius: 3px;
  margin-bottom: 7px;
}
.mock-line.tall { height: 11px; }
.mock-line.dark { background: #2a3a4a; }
.mock-line.gray { background: #c9d2dc; }
.mock-line.light { background: #ffffff; }
.mock-line.lightgray { background: #8a7a7c; }
.mock-line.s1-accent { background: #1a7fd4; height: 5px; }
.mock-line.s2-accent { background: #c8161d; height: 5px; }
.w40 { width: 40%; }
.w50 { width: 50%; }
.w60 { width: 60%; }
.w70 { width: 70%; }
.w80 { width: 80%; }
.mock-btns {
  display: flex;
  gap: 6px;
  margin-top: 10px;
}
.mock-btn {
  width: 40px;
  height: 13px;
  border-radius: 3px;
}
.mock-btn.s1 { background: #1a7fd4; }
.mock-btn.s2 { background: #c8161d; }
.mock-btn.ghost { border: 1px solid #cdd6e0; }
.mock-btn.ghost-light { border: 1px solid rgba(255,255,255,0.5); }
.mock-statbar {
  display: flex;
  gap: 1px;
  margin-top: 14px;
  border-top: 1px solid #333;
  padding-top: 8px;
}
.mock-statbar span {
  flex: 1;
  height: 10px;
  background: rgba(255,255,255,0.12);
}
/* MOCK_CARDS_CSS */
/* 卡片区 */
.mock-cards {
  display: flex;
  gap: 8px;
  padding: 12px 14px;
  background: #fff;
}
.mock-cards.tight {
  gap: 1px;
  padding: 0;
  background: #e6e2db;
}
.mock-card {
  flex: 1;
  height: 40px;
  border-radius: 6px;
}
.mock-card.s1 {
  background: #f4f7fc;
  border: 1px solid #e6eef7;
}
.mock-card.s2 {
  background: #fff;
  border-radius: 0;
  height: 46px;
  position: relative;
}
.mock-card.s2 i {
  position: absolute;
  top: 8px;
  left: 8px;
  width: 12px;
  height: 12px;
  background: #c8161d;
  opacity: 0.25;
  border-radius: 2px;
}
</style>
