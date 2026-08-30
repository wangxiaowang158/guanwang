<template>
  <div class="page-container">
    <slot />
  </div>
</template>

<script setup lang="ts"></script>

<style scoped>
.page-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}
</style>
