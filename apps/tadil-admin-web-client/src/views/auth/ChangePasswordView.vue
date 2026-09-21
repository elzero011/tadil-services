<template>
  <section class="mx-auto w-full max-w-6xl space-y-6">
    <header class="flex flex-wrap items-start justify-between gap-4">
      <div class="flex min-w-0 items-start gap-3">
        <span
          class="mt-1 rounded-2xl bg-primary/10 p-3 text-primary"
          aria-hidden="true"
        >
          <ShieldCheck class="h-6 w-6" />
        </span>
        <div class="min-w-0">
          <p
            class="text-sm font-semibold uppercase tracking-[0.14em] text-primary"
          >
            {{ $t('auth.brand') }}
          </p>
          <h1 class="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
            {{ $t('auth.changePassword') }}
          </h1>
          <p class="mt-2 max-w-2xl text-sm text-muted-foreground">
            {{ $t('auth.passwordHint') }}
          </p>
        </div>
      </div>
    </header>

    <form
      class="max-w-2xl rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-7"
      :aria-busy="loading"
      @submit.prevent="submit"
    >
      <div class="space-y-5">
        <p
          v-if="message"
          class="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
          :class="{
            'bg-green-600/10 text-green-700 dark:text-green-400': done,
          }"
          role="status"
          aria-live="polite"
        >
          {{ $t(message) }}
        </p>
        <div class="grid gap-5">
          <label class="form-label" for="current-password"
            >{{ $t('auth.currentPassword')
            }}<input
              id="current-password"
              v-model="currentPassword"
              class="form-input"
              type="password"
              autocomplete="current-password"
              required
          /></label>
          <label class="form-label" for="new-password"
            >{{ $t('auth.newPassword')
            }}<input
              id="new-password"
              v-model="newPassword"
              class="form-input"
              type="password"
              autocomplete="new-password"
              maxlength="128"
              required
          /></label>
          <label class="form-label" for="confirm-password"
            >{{ $t('auth.confirmPassword')
            }}<input
              id="confirm-password"
              v-model="confirmation"
              class="form-input"
              type="password"
              autocomplete="new-password"
              maxlength="128"
              required
          /></label>
        </div>
        <PasswordRules :password="newPassword" />
        <div
          class="flex flex-wrap justify-end gap-3 border-t border-border pt-5"
        >
          <button
            class="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
            type="submit"
            :disabled="loading || done"
          >
            {{ loading ? $t('auth.signingIn') : $t('auth.updatePassword') }}
          </button>
        </div>
      </div>
    </form>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { ShieldCheck } from 'lucide-vue-next';
import { useRouter } from 'vue-router';
import { authHttp, clearAuth } from '@/auth';
import PasswordRules from './PasswordRules.vue';

const { t } = useI18n();
const router = useRouter();
const currentPassword = ref('');
const newPassword = ref('');
const confirmation = ref('');
const message = ref('');
const done = ref(false);
const loading = ref(false);
const valid = (value: string) =>
  value.length >= 12 &&
  value.length <= 128 &&
  /[a-z]/.test(value) &&
  /[A-Z]/.test(value) &&
  /\d/.test(value) &&
  /[^A-Za-z\d]/.test(value);

const submit = async () => {
  if (loading.value || done.value) return;
  done.value = false;
  if (!valid(newPassword.value)) {
    message.value = 'auth.passwordRequirements';
    return;
  }
  if (newPassword.value !== confirmation.value) {
    message.value = 'auth.passwordMismatch';
    return;
  }
  if (!window.confirm(t('auth.confirmPasswordChange'))) return;
  loading.value = true;
  message.value = '';
  try {
    await authHttp.post('/api/auth/password', {
      currentPassword: currentPassword.value,
      newPassword: newPassword.value,
    });
    clearAuth();
    done.value = true;
    message.value = 'auth.passwordUpdated';
    setTimeout(() => router.replace('/login'), 900);
  } catch {
    message.value = 'auth.updateFailed';
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.form-label {
  display: grid;
  min-width: 0;
  gap: 0.5rem;
  color: hsl(var(--foreground));
  font-size: 0.875rem;
  font-weight: 600;
}
.form-input {
  min-width: 0;
  width: 100%;
  border: 1px solid hsl(var(--input));
  border-radius: 0.5rem;
  background: hsl(var(--background));
  padding: 0.7rem 0.8rem;
  font: inherit;
  font-weight: 400;
  outline: none;
}
.form-input:focus {
  border-color: hsl(var(--ring));
  box-shadow: 0 0 0 2px hsl(var(--ring) / 0.2);
}
</style>
