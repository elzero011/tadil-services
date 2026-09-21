import { createApp } from 'vue';
import './style.css';
import App from './App.vue';
import i18n from './i18n/i18n';
import router from './router';
import { apiClient } from './integration';
import { hydrateAuth, refreshAuth, authState, can } from './auth';

const app = createApp(App);

app.config.globalProperties.$api = apiClient;

app.use(i18n);

hydrateAuth().then(async () => {
  app.use(router);
  await router.isReady();
  app.mount('#app');
  const recheckAccess = async () => {
    if (!authState.user) return;
    await refreshAuth();
    const route = router.currentRoute.value;
    if (!authState.user && !route.meta.guest) await router.replace('/login');
    else if (route.meta.permission && !can(route.meta.permission as string))
      await router.replace('/forbidden');
  };
  window.addEventListener('focus', () => {
    void recheckAccess();
  });
  window.setInterval(() => {
    if (!document.hidden) void recheckAccess();
  }, 60000);
});

declare module 'vue' {
  interface ComponentCustomProperties {
    $api: typeof apiClient;
  }
}
