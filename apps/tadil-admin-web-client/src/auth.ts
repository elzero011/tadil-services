import axios from "axios";
import { computed, reactive } from "vue";

export interface Role { id: string; name: string; permissions: string[] }
export interface User { id: string; email: string; name: string; permissions: string[]; roles: Role[]; csrfToken: string; isSystemAdmin: boolean }
const http = axios.create({ baseURL: import.meta.env.VITE_TADIL_API_URL || "", withCredentials: true });
export const authState = reactive<{ user: User | null; loading: boolean; hydrated: boolean; csrfToken: string | null }>({ user: null, loading: false, hydrated: false, csrfToken: null });
export const useAuth = () => ({ user: computed(() => authState.user), loading: computed(() => authState.loading), can, logout, login });
export const can = (permission: string) => !!authState.user?.permissions?.includes(permission);
export const getCsrfToken = () => authState.csrfToken;
export const login = async (email: string, password: string) => {
  const { data } = await http.post("/api/auth/login", { email, password });
  authState.user = data; authState.csrfToken = data.csrfToken || null; return data as User;
};
export const refreshAuth = async () => {
  try { const { data } = await http.get("/api/auth/me"); authState.user = data; authState.csrfToken = data.csrfToken || authState.csrfToken; return data; }
  catch (error: any) { if (error.response?.status === 401) clearAuth(); return authState.user; }
};
export const hydrateAuth = async () => { authState.loading = true; await refreshAuth(); authState.hydrated = true; authState.loading = false; };
export const logout = async () => { try { await http.post("/api/auth/logout", undefined, { headers: { "X-CSRF-Token": authState.csrfToken || "" } }); } finally { clearAuth(); window.location.assign("/login"); } };
export const clearAuth = () => { authState.user = null; authState.csrfToken = null; };
export const authHttp = http;
http.interceptors.request.use((config) => {
  if (!["get", "head", "options"].includes((config.method || "get").toLowerCase()) && authState.csrfToken) config.headers["X-CSRF-Token"] = authState.csrfToken;
  return config;
});
http.interceptors.response.use(undefined, async (error) => {
  const request = error.config;
  const status = error.response?.status;
  if (status === 401 && !request?._authRetry) {
    clearAuth();
    if (!window.location.pathname.startsWith("/login")) window.location.assign(`/login?returnUrl=${encodeURIComponent(window.location.pathname)}`);
  } else if (status === 403 && !request?._authRetry && !request?.url?.endsWith("/auth/me")) {
    request._authRetry = true;
    await refreshAuth();
  }
  return Promise.reject(error);
});
