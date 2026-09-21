import { watch } from 'vue';
import { createI18n } from 'vue-i18n';
import { en, ar, hi, bn, ur } from './locales';
import { accessEn, accessAr } from './access-messages';
import { authEn, authAr } from './auth-messages';
import { staffEn, staffAr } from './staff-messages';
import {
  hiAccessMessages,
  bnAccessMessages,
  urAccessMessages,
} from './additional-access-messages';

export const localeOptions = [
  { key: 'en', label: 'English', direction: 'ltr' },
  { key: 'ar', label: 'العربية', direction: 'rtl' },
  { key: 'hi', label: 'हिन्दी', direction: 'ltr' },
  { key: 'bn', label: 'বাংলা', direction: 'ltr' },
  { key: 'ur', label: 'اردو', direction: 'rtl' },
];
const savedLocale = localStorage.getItem('locale');

const i18n = createI18n({
  legacy: false,
  locale: localeOptions.some((option) => option.key === savedLocale)
    ? savedLocale!
    : 'ar',
  fallbackLocale: 'en',
  messages: {
    en: { ...en, ...authEn, access: accessEn, staff: staffEn },
    ar: { ...ar, ...authAr, access: accessAr, staff: staffAr },
    hi: {
      ...hi,
      ...hiAccessMessages,
      nav: {
        ...hi.nav,
        tailors: 'दर्जी',
        couriers: 'कूरियर',
        logout: 'साइन आउट',
      },
    },
    bn: {
      ...bn,
      ...bnAccessMessages,
      nav: {
        ...bn.nav,
        tailors: 'দর্জি',
        couriers: 'কুরিয়ার',
        logout: 'সাইন আউট',
      },
    },
    ur: {
      ...ur,
      ...urAccessMessages,
      nav: {
        ...ur.nav,
        tailors: 'درزی',
        couriers: 'کورئیر',
        logout: 'سائن آؤٹ',
      },
    },
  },
});

watch(
  i18n.global.locale,
  (locale) => {
    document.documentElement.lang = locale;
    document.documentElement.dir =
      localeOptions.find((option) => option.key === locale)?.direction || 'ltr';
    localStorage.setItem('locale', locale);
  },
  { immediate: true }
);

export default i18n;
