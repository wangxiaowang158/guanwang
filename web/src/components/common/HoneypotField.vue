<template>
  <!-- 蜜罐：移出可视区而非 display:none（部分脚本会跳过不可见字段）；
       aria-hidden + tabindex=-1 让读屏与键盘用户都碰不到，autocomplete=off 防浏览器自动填充误伤真人 -->
  <div class="hp" aria-hidden="true">
    <label>
      网站
      <input v-model="model" type="text" name="website" tabindex="-1" autocomplete="off" />
    </label>
  </div>
</template>

<script setup lang="ts">
// 匿名表单蜜罐字段，配合 useFormGuard 使用
const model = defineModel<string>({ required: true })
</script>

<style scoped>
/* 视觉隐藏：裁成 1px 而非远距离偏移，避免在溢出可滚动的弹窗里撑出横向滚动条 */
.hp {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}
</style>
