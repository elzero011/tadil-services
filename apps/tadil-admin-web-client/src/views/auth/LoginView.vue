<template>
  <AuthShell branded>
    <form
      class="auth-card"
      aria-labelledby="login-title"
      :aria-busy="loading"
      @submit.prevent="submit"
    >
      <div class="auth-card-heading">
        <span class="auth-eyebrow">{{ $t('auth.brand') }}</span>
        <h1 id="login-title">{{ $t('auth.signIn') }}</h1>
        <p>{{ $t('auth.signInHint') }}</p>
      </div>
      <p v-if="error" id="login-error" class="auth-alert" role="alert">
        {{ $t(error) }}
      </p>
      <label class="auth-label" for="login-email"
        >{{ $t('auth.email')
        }}<input
          id="login-email"
          v-model="email"
          type="email"
          autocomplete="username"
          autocapitalize="none"
          spellcheck="false"
          :aria-invalid="!!error"
          :aria-describedby="error ? 'login-error' : undefined"
          required
      /></label>
      <label class="auth-label" for="login-password"
        >{{ $t('auth.password') }}
        <div class="auth-password">
          <input
            id="login-password"
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            autocomplete="current-password"
            :aria-invalid="!!error"
            :aria-describedby="error ? 'login-error' : undefined"
            required
          /><button
            type="button"
            class="auth-icon-button"
            :aria-label="
              $t(showPassword ? 'auth.hidePassword' : 'auth.showPassword')
            "
            :aria-pressed="showPassword"
            aria-controls="login-password"
            @click="showPassword = !showPassword"
          >
            <EyeOff v-if="showPassword" :size="20" aria-hidden="true" />
            <Eye v-else :size="20" aria-hidden="true" />
          </button></div
      ></label>
      <button class="auth-primary" type="submit" :disabled="loading">
        {{ loading ? $t('auth.signingIn') : $t('auth.signInButton') }}
      </button>
    </form>
  </AuthShell>
</template>
<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Eye, EyeOff } from 'lucide-vue-next';
import { login } from '@/auth';
import AuthShell from './AuthShell.vue';
const email = ref('');
const password = ref('');
const showPassword = ref(false);
const error = ref('');
const loading = ref(false);
const router = useRouter();
const route = useRoute();
const submit = async () => {
  if (loading.value) return;
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
    error.value = 'auth.invalidCredentials';
  } finally {
    loading.value = false;
  }
};
</script>
<style scoped>
.auth-card {
  width: min(100%, 440px);
  display: grid;
  gap: 20px;
  border: 1px solid hsl(var(--border));
  border-radius: 20px;
  background: hsl(var(--background) / 0.94);
  padding: clamp(24px, 5vw, 40px);
  box-shadow: 0 24px 70px -35px hsl(var(--primary) / 0.45);
}
.auth-card-heading {
  display: grid;
  gap: 8px;
}
.auth-card-heading h1 {
  font-size: clamp(1.6rem, 4vw, 2rem);
  font-weight: 700;
  letter-spacing: -0.025em;
}
.auth-card-heading p {
  color: hsl(var(--muted-foreground));
  font-size: 0.95rem;
}
.auth-eyebrow {
  color: hsl(var(--primary));
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}
.auth-label {
  display: grid;
  gap: 8px;
  font-size: 0.875rem;
  font-weight: 600;
}
.auth-label input {
  min-width: 0;
  width: 100%;
  border: 1px solid hsl(var(--border));
  border-radius: 10px;
  background: hsl(var(--background));
  padding: 12px 14px;
  font: inherit;
  outline: none;
}
.auth-label input:focus {
  border-color: hsl(var(--primary));
  box-shadow: 0 0 0 3px hsl(var(--primary) / 0.15);
}
.auth-password {
  position: relative;
}
.auth-password input {
  padding-inline-end: 44px;
}
.auth-icon-button {
  display: grid;
  place-items: center;
  position: absolute;
  inset-inline-end: 8px;
  top: 7px;
  width: 34px;
  height: 34px;
  color: hsl(var(--muted-foreground));
}
.auth-primary {
  border-radius: 10px;
  background: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
  padding: 13px;
  font-weight: 700;
  transition: opacity 0.2s;
}
.auth-primary:disabled {
  opacity: 0.6;
  cursor: wait;
}
.auth-alert {
  border-radius: 9px;
  background: hsl(var(--destructive) / 0.1);
  color: hsl(var(--destructive));
  padding: 10px 12px;
  font-size: 0.875rem;
}
</style>
