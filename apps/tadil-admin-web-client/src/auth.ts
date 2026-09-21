import axios from 'axios';
import { computed, reactive } from 'vue';

export interface Role {
  id: string;
  name: string;
  permissions: string[];
  isSystem?: boolean;
}
export interface User {
  id: string;
  email: string;
  name: string;
  permissions: string[];
  roles: Role[];
  csrfToken: string;
  isSystemAdmin: boolean;
}
export const authHttp = axios.create({
  baseURL: import.meta.env.VITE_TADIL_API_URL || '',
  withCredentials: true,
  timeout: 15000,
});
export const authState = reactive<{
  user: User | null;
  loading: boolean;
  hydrated: boolean;
  csrfToken: string | null;
}>({ user: null, loading: false, hydrated: false, csrfToken: null });
export const can = (permission: string) =>
  !!authState.user?.permissions.includes(permission);
export const getCsrfToken = () => authState.csrfToken;
export const clearAuth = () => {
  authState.user = null;
  authState.csrfToken = null;
};
const setUser = (user: User) => {
  authState.user = user;
  authState.csrfToken = user.csrfToken;
};

export async function login(email: string, password: string) {
  const { data } = await authHttp.post<User>('/api/auth/login', {
    email,
    password,
  });
  setUser(data);
  return data;
}

let refreshing: Promise<User | null> | undefined;
export function refreshAuth(): Promise<User | null> {
  refreshing ??= authHttp
    .get<User>('/api/auth/me')
    .then(({ data }) => {
      setUser(data);
      return data;
    })
    .catch((error: unknown) => {
      if (axios.isAxiosError(error) && error.response?.status === 401)
        clearAuth();
      return authState.user;
    })
    .finally(() => {
      refreshing = undefined;
    });
  return refreshing;
}

export async function hydrateAuth() {
  authState.loading = true;
  try {
    await refreshAuth();
  } finally {
    authState.hydrated = true;
    authState.loading = false;
  }
}

export async function logout() {
  try {
    await authHttp.post('/api/auth/logout');
  } catch (error) {
    if (!axios.isAxiosError(error) || error.response?.status !== 401) {
      window.alert('Unable to sign out. Please try again.');
      return;
    }
  }
  clearAuth();
  window.location.assign('/login');
}

export const useAuth = () => ({
  user: computed(() => authState.user),
  loading: computed(() => authState.loading),
  can,
  logout,
  login,
});
authHttp.interceptors.request.use((config) => {
  if (
    !['get', 'head', 'options'].includes(
      (config.method || 'get').toLowerCase()
    ) &&
    authState.csrfToken
  )
    config.headers['X-CSRF-Token'] = authState.csrfToken;
  return config;
});
authHttp.interceptors.response.use(undefined, async (error) => {
  const request = error.config;
  const authEntry = [
    '/api/auth/me',
    '/api/auth/login',
    '/api/auth/accept-invitation',
  ].includes(request?.url);
  if (error.response?.status === 401 && !authEntry) {
    clearAuth();
    if (window.location.pathname !== '/login')
      window.location.assign(
        `/login?returnUrl=${encodeURIComponent(window.location.pathname)}`
      );
  } else if (
    error.response?.status === 403 &&
    !authEntry &&
    !request?._authRetry
  ) {
    request._authRetry = true;
    await refreshAuth();
  }
  return Promise.reject(error);
});
