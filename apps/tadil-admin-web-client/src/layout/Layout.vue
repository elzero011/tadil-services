<template>
  <div class="h-screen w-screen grid grid-rows-[auto_1fr] bg-background">
    <AppHeader />
    <div
      class="h-full min-h-0 w-full grid grid-cols-[auto_minmax(0,1fr)] overflow-hidden"
    >
      <Sidebar />
      <main class="min-w-0 p-3 sm:p-6 bg-muted/10 h-full overflow-auto">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import AppHeader from './AppHeader.vue';
import Sidebar from './Sidebar.vue';
</script>
