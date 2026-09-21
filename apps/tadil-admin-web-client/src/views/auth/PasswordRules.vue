<template>
  <div class="space-y-2 rounded-lg border bg-muted/30 p-3 text-sm">
    <p class="font-medium">{{ $t('auth.passwordRules') }}</p>
    <ul class="grid gap-1 text-muted-foreground sm:grid-cols-2">
      <li
        v-for="rule in rules"
        :key="rule.key"
        :class="{ 'text-green-700 dark:text-green-400': rule.valid }"
      >
        <span aria-hidden="true">{{ rule.valid ? '✓' : '○' }}</span>
        {{ $t(rule.key) }}
      </li>
    </ul>
  </div>
</template>
<script setup lang="ts">
import { computed } from 'vue';
const props = defineProps<{ password: string }>();
const rules = computed(() => [
  {
    key: 'auth.ruleLength',
    valid: props.password.length >= 12 && props.password.length <= 128,
  },
  { key: 'auth.ruleLower', valid: /[a-z]/.test(props.password) },
  { key: 'auth.ruleUpper', valid: /[A-Z]/.test(props.password) },
  { key: 'auth.ruleNumber', valid: /\d/.test(props.password) },
  { key: 'auth.ruleSymbol', valid: /[^A-Za-z\d]/.test(props.password) },
]);
</script>
