<template>
  <ElConfigProvider :locale="elLocale">
    <AppLayout v-if="route.meta.requiresAuth">
      <router-view />
    </AppLayout>
    <router-view v-else />
  </ElConfigProvider>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { ElConfigProvider } from 'element-plus';
import zhCn from 'element-plus/es/locale/lang/zh-cn';
import en from 'element-plus/es/locale/lang/en';
import AppLayout from './components/AppLayout.vue';

const route = useRoute();
const { locale } = useI18n();

const elLocale = computed(() => (locale.value === 'zh-CN' ? zhCn : en));
</script>
