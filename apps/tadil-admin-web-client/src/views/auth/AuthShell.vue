<template>
  <main
    class="auth-shell"
    :class="{ 'auth-shell--compact': compact, 'auth-shell--branded': branded }"
  >
    <header class="auth-toolbar" :class="{ 'auth-toolbar--branded': branded }">
      <img
        v-if="!branded"
        src="/Tadil_logo.svg"
        :alt="$t('auth.brand')"
        class="auth-logo"
      />
      <div class="auth-controls">
        <LocalesToggle />
        <ThemeToggle />
      </div>
    </header>
    <section class="auth-content">
      <img
        v-if="branded"
        src="/Tadil_logo.svg"
        :alt="$t('auth.brand')"
        class="auth-logo auth-logo--centered"
      />
      <slot />
    </section>
  </main>
</template>

<script setup lang="ts">
import LocalesToggle from '@/components/LocalesToggle.vue';
import ThemeToggle from '@/components/ThemeToggle.vue';
defineProps<{ compact?: boolean; branded?: boolean }>();
</script>

<style scoped>
.auth-shell {
  --auth-burgundy: #6d0f2f;
  min-height: 100dvh;
  background: radial-gradient(
    1200px 600px at 50% -10%,
    #fae9ec 0%,
    #fff0e4 45%,
    #fffaf6 100%
  );
  color: #4a1723;
  padding: 24px clamp(16px, 4vw, 56px);
}
.dark .auth-shell {
  background: radial-gradient(
    1000px 520px at 50% -10%,
    #3b1d28 0%,
    #211117 48%,
    #180d11 100%
  );
  color: #fff4f1;
}
.auth-shell--branded {
  padding-top: 18px;
}
.auth-shell--compact {
  padding-top: 16px;
}
.auth-toolbar {
  max-width: 1120px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.auth-toolbar--branded {
  justify-content: flex-end;
}
.auth-logo {
  width: 112px;
  height: auto;
  object-fit: contain;
}
.auth-controls {
  display: flex;
  align-items: center;
  gap: 4px;
}
.auth-content {
  min-height: calc(100dvh - 96px);
  display: grid;
  place-items: center;
  padding: 36px 0;
}
.auth-shell--branded .auth-content {
  align-content: center;
  gap: 18px;
}
.auth-logo--centered {
  width: 140px;
}
@media (max-width: 480px) {
  .auth-shell {
    padding-inline: 14px;
  }
  .auth-logo {
    width: 94px;
  }
  .auth-content {
    padding-block: 24px;
  }
}
</style>
