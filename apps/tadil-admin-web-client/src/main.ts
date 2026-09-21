import { createApp } from "vue";
import "./style.css";
import App from "./App.vue";
import i18n from "./i18n/i18n";
import router from "./router";
import { apiClient } from "./integration";
import { hydrateAuth, refreshAuth, authState } from "./auth";

const app = createApp(App);

app.config.globalProperties.$api = apiClient;

app.use(router);
app.use(i18n);

hydrateAuth().finally(() => {
  app.mount("#app");
  window.addEventListener("focus", () => { if (authState.user) void refreshAuth(); });
});

declare module "vue" {
  interface ComponentCustomProperties {
    $api: typeof apiClient;
  }
}
