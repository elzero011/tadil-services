<template>
  <AuthShell
    ><div class="status-card">
      <div class="status-code">403</div>
      <h1>{{ $t('auth.accessDenied') }}</h1>
      <p>{{ $t('auth.accessDeniedHint') }}</p>
      <RouterLink class="status-link" to="/">{{
        $t('auth.backHome')
      }}</RouterLink>
    </div></AuthShell
  >
</template>
<script setup lang="ts">
import AuthShell from './AuthShell.vue';
</script>
<style scoped>
.status-card {
  width: min(100%, 520px);
  text-align: center;
  border: 1px solid hsl(var(--border));
  border-radius: 20px;
  background: hsl(var(--background) / 0.94);
  padding: 48px 28px;
  box-shadow: 0 24px 70px -35px hsl(var(--primary) / 0.45);
}
.status-code {
  color: hsl(var(--primary));
  font-size: 4rem;
  font-weight: 800;
  line-height: 1;
}
.status-card h1 {
  margin-top: 18px;
  font-size: 1.7rem;
  font-weight: 700;
}
.status-card p {
  margin: 8px 0 26px;
  color: hsl(var(--muted-foreground));
}
.status-link {
  display: inline-flex;
  border-radius: 9px;
  background: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
  padding: 11px 18px;
  font-weight: 600;
}
</style>
