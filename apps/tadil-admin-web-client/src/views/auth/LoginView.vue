<template>
  <main class="staff-login" dir="ltr">
    <ThemeToggle class="login-theme-toggle" />
    <div class="login-container">
      <img class="login-logo" src="/Tadil_logo.svg" alt="Tadil — تعديل" />
      <form
        class="login-card"
        aria-labelledby="login-title"
        :aria-busy="loading"
        @submit.prevent="submit"
      >
        <h1 id="login-title">Sign in to your account</h1>
        <p v-if="error" id="login-error" class="login-error" role="alert">
          {{ error }}
        </p>
        <div class="login-field">
          <label for="login-email">Email</label>
          <input
            id="login-email"
            v-model="email"
            name="email"
            type="email"
            autocomplete="username"
            autocapitalize="none"
            spellcheck="false"
            required
            :aria-invalid="!!error"
            :aria-describedby="error ? 'login-error' : undefined"
          />
        </div>
        <div class="login-field">
          <label for="login-password">Password</label>
          <div class="login-password">
            <input
              id="login-password"
              v-model="password"
              name="password"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="current-password"
              required
              :aria-invalid="!!error"
              :aria-describedby="error ? 'login-error' : undefined"
            />
            <button
              type="button"
              class="password-toggle"
              :aria-label="showPassword ? 'Hide password' : 'Show password'"
              :aria-pressed="showPassword"
              aria-controls="login-password"
              @click="showPassword = !showPassword"
            >
              <EyeOff v-if="showPassword" :size="20" aria-hidden="true" />
              <Eye v-else :size="20" aria-hidden="true" />
            </button>
          </div>
        </div>
        <button class="login-submit" type="submit" :disabled="loading">
          {{ loading ? 'Signing in…' : 'Sign in' }}
        </button>
      </form>
    </div>
  </main>
</template>
<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Eye, EyeOff } from 'lucide-vue-next';
import ThemeToggle from '@/components/ThemeToggle.vue';
import { login } from '@/auth';
const email = ref('');
const password = ref('');
const showPassword = ref(false);
const error = ref('');
const loading = ref(false);
const router = useRouter();
const route = useRoute();
const submit = async () => {
  loading.value = true;
  error.value = '';
  try {
    await login(email.value, password.value);
    const target =
      typeof route.query.returnUrl === 'string' &&
      route.query.returnUrl.startsWith('/') &&
      !route.query.returnUrl.startsWith('//') &&
      !route.query.returnUrl.includes('\\')
        ? route.query.returnUrl
        : '/';
    await router.replace(target);
  } catch {
    error.value = 'Invalid email or password.';
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
/* Preserve the former Keycloak theme without its provider-specific styles. */
.staff-login {
  --login-primary: #6d0f2f;
  --login-primary-hover: #600d29;
  --login-bg-from: #fae9ec;
  --login-bg-mid: #fff0e4;
  --login-bg-base: #fffaf6;
  --login-card: #fffdfb;
  --login-input: #fffdfb;
  --login-foreground: #4a1723;
  --login-muted: #915668;
  --login-border: #ead3d6;
  --login-border-strong: #c89ba5;
  --login-shadow: 0 10px 30px -12px rgb(109 15 47 / 25%),
    0 4px 10px -6px rgb(74 23 35 / 8%);
  min-height: 100vh;
  min-height: 100dvh;
  padding: 40px 20px;
  background: radial-gradient(
    1200px 600px at 50% -10%,
    var(--login-bg-from) 0%,
    var(--login-bg-mid) 45%,
    var(--login-bg-base) 100%
  );
  background-attachment: fixed;
  color: var(--login-foreground);
  font-family: 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif;
}

.dark .staff-login {
  --login-primary: #9b3154;
  --login-primary-hover: #a54665;
  --login-bg-from: #3b1d28;
  --login-bg-mid: #211117;
  --login-bg-base: #180d11;
  --login-card: #2a171e;
  --login-input: #211117;
  --login-foreground: #fff4f1;
  --login-muted: #c996a0;
  --login-border: #482733;
  --login-border-strong: #724253;
  --login-shadow: 0 10px 30px -12px rgb(0 0 0 / 60%),
    0 4px 10px -6px rgb(0 0 0 / 40%);
}

.login-container {
  max-width: 500px;
  margin: 0 auto;
}
.login-logo {
  display: block;
  width: 100%;
  height: 140px;
  object-fit: contain;
  margin-bottom: 18px;
}
.login-card {
  padding: 32px 32px 28px;
  border: 1px solid var(--login-border);
  border-radius: 14px;
  background: var(--login-card);
  box-shadow: var(--login-shadow);
}
.login-card h1 {
  margin: 0 0 28px;
  text-align: center;
  font-size: 22px;
  font-weight: 700;
}
.login-field {
  margin-bottom: 20px;
}
.login-field label {
  display: block;
  margin-bottom: 6px;
  font-size: 13px;
  font-weight: 600;
}
.login-field input {
  width: 100%;
  height: 46px;
  border: 1px solid var(--login-border);
  border-radius: 10px;
  padding: 0 14px;
  font-size: 14px;
  color: var(--login-foreground);
  background: var(--login-input);
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.login-field input:hover {
  border-color: var(--login-border-strong);
}
.login-field input:focus {
  border-color: var(--login-primary);
  box-shadow: 0 0 0 3px rgb(109 15 47 / 22%);
  outline: none;
}
.login-password {
  display: flex;
}
.login-password input {
  min-width: 0;
  border-right: none;
  border-radius: 10px 0 0 10px;
}
.password-toggle {
  flex-shrink: 0;
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  border: 1px solid var(--login-border);
  border-left: none;
  border-radius: 0 10px 10px 0;
  color: var(--login-muted);
  background: var(--login-input);
  cursor: pointer;
}
.login-password:focus-within input,
.login-password:focus-within .password-toggle {
  border-color: var(--login-primary);
}
.password-toggle:hover {
  color: var(--login-primary);
}
.login-submit {
  width: 100%;
  height: 46px;
  border: none;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.2px;
  color: #fff;
  background: var(--login-primary);
  box-shadow: 0 6px 14px -6px rgb(109 15 47 / 60%);
  cursor: pointer;
  transition: background 0.15s ease, transform 0.05s ease;
}
.login-submit:hover {
  background: var(--login-primary-hover);
}
.login-submit:active {
  transform: translateY(1px);
}
.login-submit:disabled {
  opacity: 0.65;
  cursor: wait;
}
.login-error {
  margin-bottom: 20px;
  padding: 12px;
  border: 1px solid var(--login-border-strong);
  border-radius: 10px;
  font-size: 14px;
}
.staff-login button:focus-visible {
  outline: 2px solid var(--login-primary);
  outline-offset: 3px;
}
.login-theme-toggle {
  position: fixed;
  top: 18px;
  right: 18px;
  width: 42px;
  height: 42px;
  border: 1px solid var(--login-border);
  border-radius: 50%;
  background: var(--login-card);
  color: var(--login-foreground);
  box-shadow: var(--login-shadow);
}
.login-theme-toggle:hover {
  border-color: var(--login-primary);
  color: var(--login-primary);
  background: var(--login-card);
}

@media (max-width: 480px) {
  .login-logo {
    height: 104px;
  }
  .login-card {
    padding: 24px 20px;
    border-radius: 12px;
  }
}
</style>
