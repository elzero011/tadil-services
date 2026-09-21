<template>
  <label class="relative inline-flex items-center">
    <Languages
      class="pointer-events-none absolute start-2.5 h-4 w-4 text-muted-foreground"
      aria-hidden="true"
    />
    <select
      v-model="locale"
      :aria-label="t('access.language')"
      class="h-10 max-w-36 cursor-pointer rounded-lg border border-input bg-background py-2 pe-2 ps-8 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
    >
      <option
        v-for="option in localeOptions"
        :key="option.key"
        :value="option.key"
      >
        {{ option.label }}
      </option>
    </select>
  </label>
</template>
<script setup lang="ts">
import { Languages } from 'lucide-vue-next';
import { useI18n } from 'vue-i18n';
import { localeOptions } from '@/i18n/i18n';
const { locale, t } = useI18n();
</script>
