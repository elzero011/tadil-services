<template>
  <AuthShell branded
    ><form class="auth-card" @submit.prevent="submit">
      <div class="auth-card-heading">
        <h1>{{ $t('auth.setPassword') }}</h1>
        <p>{{ $t('auth.passwordHint') }}</p>
      </div>
      <p
        v-if="message"
        class="auth-alert"
        :class="{ success: done }"
        role="status"
      >
        {{ $t(message) }}
      </p>
      <label class="auth-label"
        >{{ $t('auth.newPassword')
        }}<input
          v-model="password"
          type="password"
          autocomplete="new-password"
          maxlength="128"
          required /></label
      ><label class="auth-label"
        >{{ $t('auth.confirmPassword')
        }}<input
          v-model="confirmation"
          type="password"
          autocomplete="new-password"
          maxlength="128"
          required /></label
      ><PasswordRules :password="password" /><button
        class="auth-primary"
        :disabled="loading || done || !token"
      >
        {{ $t('auth.savePassword') }}
      </button>
      <RouterLink
        to="/login"
        class="text-center text-sm font-medium text-primary underline-offset-4 hover:underline"
        >{{ $t('auth.returnToSignIn') }}</RouterLink
      >
    </form></AuthShell
  >
</template>
<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { authHttp } from '@/auth';
import AuthShell from './AuthShell.vue';
import PasswordRules from './PasswordRules.vue';
const router = useRouter();
const password = ref('');
const confirmation = ref('');
const message = ref('');
const done = ref(false);
const loading = ref(false);
const valid = (v: string) =>
  v.length >= 12 &&
  v.length <= 128 &&
  /[a-z]/.test(v) &&
  /[A-Z]/.test(v) &&
  /\d/.test(v) &&
  /[^A-Za-z\d]/.test(v);
const hash = window.location.hash.replace(/^#/, '');
let token = hash;
try {
  token = decodeURIComponent(hash.startsWith('token=') ? hash.slice(6) : hash);
} catch {
  token = '';
}
window.history.replaceState(
  {},
  document.title,
  `${window.location.pathname}${window.location.search}`
);
if (!token) message.value = 'auth.invitationInvalid';
const submit = async () => {
  if (loading.value || done.value) return;
  if (!token) {
    message.value = 'auth.invitationInvalid';
    return;
  }
  if (!valid(password.value)) {
    message.value = 'auth.passwordRequirements';
    done.value = false;
    return;
  }
  if (password.value !== confirmation.value) {
    message.value = 'auth.passwordMismatch';
    done.value = false;
    return;
  }
  loading.value = true;
  try {
    await authHttp.post('/api/auth/accept-invitation', {
      token,
      password: password.value,
    });
    done.value = true;
    message.value = 'auth.passwordSaved';
    setTimeout(() => router.replace('/login'), 900);
  } catch {
    done.value = false;
    message.value = 'auth.invitationInvalid';
  } finally {
    loading.value = false;
  }
};
</script>
<style scoped>
.auth-card {
  width: min(100%, 500px);
  display: grid;
  gap: 18px;
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
  font-size: 1.8rem;
  font-weight: 700;
}
.auth-card-heading p {
  color: hsl(var(--muted-foreground));
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
  padding: 12px 14px;
  background: hsl(var(--background));
}
.auth-primary {
  border-radius: 10px;
  background: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
  padding: 13px;
  font-weight: 700;
}
.auth-primary:disabled {
  opacity: 0.6;
}
.auth-alert {
  border-radius: 9px;
  background: hsl(var(--destructive) / 0.1);
  color: hsl(var(--destructive));
  padding: 10px 12px;
  font-size: 0.875rem;
}
.auth-alert.success {
  background: hsl(142 70% 35% / 0.12);
  color: hsl(142 70% 30%);
}
</style>
