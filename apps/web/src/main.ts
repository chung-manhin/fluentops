import 'element-plus/dist/index.css';

import { createPinia } from 'pinia';
import ElementPlus from 'element-plus';
import { createApp } from 'vue';

import App from './App.vue';
import { router } from './router';
import i18n from './i18n';
import './style.css';

createApp(App).use(createPinia()).use(router).use(i18n).use(ElementPlus).mount('#app');
