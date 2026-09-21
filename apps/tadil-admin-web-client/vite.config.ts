import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";
import * as path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const VITE_TADIL_API_URL = env.VITE_TADIL_API_URL;
  const DEEPL_URL = "https://api-free.deepl.com/v2/translate";
  const DEEPL_API_KEY = "f366302f-71a4-4899-a3f2-14e1b929f5e6:fx";

  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    plugins: [vue(), tailwindcss() as any],
    server: {
      allowedHosts: [
        "localhost",
        "tadil-admin-web-client-production.up.railway.app",
        ...(env.STAFF_PREVIEW_ORIGIN ? [new URL(env.STAFF_PREVIEW_ORIGIN).hostname] : []),
      ],
      host: "0.0.0.0",
      port: 4000,
      proxy: {
        "/api": {
          target: env.TADIL_API_PROXY_TARGET || VITE_TADIL_API_URL || "http://localhost:4444",
          changeOrigin: true,
        },
        // Proxy DeepL so the API key stays server-side and CORS is avoided.
        // DEEPL_URL already ends in /v2/translate, so strip the local prefix.
        "/deepl": {
          target: DEEPL_URL,
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/deepl/, ""),
          configure: (proxy) => {
            proxy.on("proxyReq", (proxyReq) => {
              if (DEEPL_API_KEY) {
                proxyReq.setHeader(
                  "Authorization",
                  `DeepL-Auth-Key ${DEEPL_API_KEY}`
                );
              }
            });
          },
        },
      },
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
