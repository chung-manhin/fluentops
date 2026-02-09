import { createI18n } from 'vue-i18n';
import en from './en';
import zhCN from './zh-CN';

const savedLocale = localStorage.getItem('locale') || 'zh-CN';

const i18n = createI18n({
  legacy: false,
  locale: savedLocale,
  fallbackLocale: 'en',
  messages: { en, 'zh-CN': zhCN },
});

export default i18n;

export function toggleLocale() {
  const { locale } = i18n.global;
  const next = locale.value === 'zh-CN' ? 'en' : 'zh-CN';
  locale.value = next;
  localStorage.setItem('locale', next);
}
