<template>
  <main class="min-h-screen grid place-items-center bg-muted/20 p-6">
    <form
      class="w-full max-w-md space-y-5 rounded-xl bg-background p-8 shadow"
      @submit.prevent="submit"
    >
      <h1 class="text-2xl font-semibold">Staff sign in</h1>
      <p v-if="error" class="text-sm text-destructive">{{ error }}</p>
      <input
        v-model="email"
        type="email"
        required
        placeholder="Email"
        class="w-full rounded border p-3"
      /><input
        v-model="password"
        type="password"
        required
        placeholder="Password"
        class="w-full rounded border p-3"
      /><button
        class="w-full rounded bg-primary p-3 text-primary-foreground"
        :disabled="loading"
      >
        Sign in
      </button>
    </form>
  </main>
</template>
<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { login } from '@/auth';
const email = ref('');
const password = ref('');
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
