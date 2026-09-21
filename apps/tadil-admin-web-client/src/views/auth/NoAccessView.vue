<template>
  <section class="space-y-4 p-10">
    <h1 class="text-3xl font-semibold">No access</h1>
    <p class="text-muted-foreground">
      Your account has no enabled permissions. Contact an administrator.
    </p>
    <RouterLink to="/password" class="me-4 underline"
      >Change password</RouterLink
    >
    <button class="underline" @click="logout">Sign out</button>
  </section>
</template>
<script setup lang="ts">
import { logout } from '@/auth';
</script>
