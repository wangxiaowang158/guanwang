<template>
  <a-config-provider :theme="themeConfig" :locale="zhCN">
    <router-view />
  </a-config-provider>
</template>

<script setup lang="ts">
import zhCN from 'ant-design-vue/es/locale/zh_CN'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import { useTheme } from '@/composables/useTheme'

// dayjs 全局设置中文
dayjs.locale('zh-cn')

const { themeConfig } = useTheme()
</script>
