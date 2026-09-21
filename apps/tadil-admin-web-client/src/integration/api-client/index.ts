import { Api } from "./tadil-api-client";
import { clearAuth, refreshAuth, getCsrfToken } from "../../auth";

const apiInstance = new Api({
  baseURL: import.meta.env.VITE_TADIL_API_URL || "",
});

apiInstance.instance.defaults.withCredentials = true;
apiInstance.instance.interceptors.request.use(async (config) => {
  const method = (config.method || "get").toLowerCase();
  if (!["get", "head", "options"].includes(method)) {
    const csrf = getCsrfToken();
    if (csrf) config.headers["X-CSRF-Token"] = csrf;
  }
  return config;
});
apiInstance.instance.interceptors.response.use(undefined, async (error) => {
  const status = error.response?.status;
  const request = error.config;
  if (status === 401 && !request?._authRetry) {
    clearAuth();
    if (window.location.pathname !== "/login") window.location.assign(`/login?returnUrl=${encodeURIComponent(window.location.pathname)}`);
  } else if (status === 403 && !request?._authRetry) {
    request._authRetry = true;
    await refreshAuth();
  }
  return Promise.reject(error);
});

export const apiClient = apiInstance.api;
