<template>
  <fieldset :disabled="disabled" class="min-w-0 space-y-4">
    <legend class="mb-1 text-base font-semibold">{{ label }}</legend>
    <p v-if="ensureRead" class="text-xs leading-relaxed text-muted-foreground">
      {{ t('access.readHint') }}
    </p>
    <div class="flex flex-wrap items-center gap-3">
      <label class="relative min-w-0 flex-1 basis-48">
        <Search
          class="pointer-events-none absolute start-3 top-3 h-4 w-4 text-muted-foreground"
        />
        <input
          v-model="search"
          type="search"
          :aria-label="t('access.permissionSearch')"
          :placeholder="t('access.permissionSearch')"
          class="h-10 w-full rounded-lg border border-input bg-background pe-3 ps-9 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </label>
      <span
        class="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary"
        aria-live="polite"
        >{{ t('access.selectedCount', { count: values.length }) }}</span
      >
    </div>
    <div v-if="!readonly" class="flex flex-wrap gap-3 text-xs font-medium">
      <button
        type="button"
        class="text-primary underline-offset-4 hover:underline disabled:opacity-50"
        :disabled="!visible.length || disabled"
        @click="selectVisible"
      >
        {{ t('access.selectVisible') }}
      </button>
      <button
        type="button"
        class="text-muted-foreground underline-offset-4 hover:underline disabled:opacity-50"
        :disabled="!values.length || disabled"
        @click="emit('update', [])"
      >
        {{ t('access.clear') }}
      </button>
    </div>
    <div class="grid gap-3 sm:grid-cols-2">
      <div
        v-for="group in groups"
        :key="group.resource"
        class="overflow-hidden rounded-xl border border-border bg-background"
      >
        <div
          class="flex items-center justify-between gap-2 border-b border-border bg-muted/30 px-4 py-3"
        >
          <h3 class="text-sm font-semibold">
            {{ t(`access.resources.${group.resource}`) }}
          </h3>
          <input
            v-if="!readonly"
            type="checkbox"
            class="h-4 w-4 shrink-0 accent-primary"
            :aria-label="
              t('access.selectGroup', {
                name: t(`access.resources.${group.resource}`),
              })
            "
            :checked="group.permissions.every((p) => values.includes(p))"
            :indeterminate="
              group.permissions.some((p) => values.includes(p)) &&
              !group.permissions.every((p) => values.includes(p))
            "
            @change="toggleGroup(group.permissions)"
          />
        </div>
        <div class="grid gap-1 p-2">
          <label
            v-for="permission in group.permissions"
            :key="permission"
            class="flex min-h-10 items-center gap-3 rounded-lg px-2 text-sm"
            :class="[
              values.includes(permission)
                ? 'bg-primary/5 text-primary'
                : 'text-muted-foreground',
              !readonly && !disabled && 'cursor-pointer hover:bg-muted/50',
            ]"
          >
            <input
              type="checkbox"
              class="h-4 w-4 shrink-0 accent-primary"
              :checked="values.includes(permission)"
              :disabled="readonly || disabled"
              @change="toggle(permission)"
            />
            {{ t(`access.actions.${permission.split('.')[1]}`) }}
          </label>
        </div>
      </div>
    </div>
    <p
      v-if="!groups.length"
      class="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground"
    >
      {{ t('access.noMatches') }}
    </p>
  </fieldset>
</template>
<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { Search } from 'lucide-vue-next';
import { addPageAccess, removePermissions } from './permission-selection';
const props = defineProps<{
  label: string;
  values: string[];
  permissions: string[];
  disabled?: boolean;
  readonly?: boolean;
  ensureRead?: boolean;
}>();
const emit = defineEmits<{ update: [string[]] }>();
const { t } = useI18n();
const search = ref('');
const visible = computed(() =>
  props.permissions.filter((permission) => {
    const [resource, action] = permission.split('.');
    return `${t(`access.resources.${resource}`)} ${t(
      `access.actions.${action}`
    )} ${permission}`
      .toLocaleLowerCase()
      .includes(search.value.trim().toLocaleLowerCase());
  })
);
const groups = computed(() =>
  [...new Set(visible.value.map((p) => p.split('.')[0]))].map((resource) => ({
    resource,
    permissions: visible.value.filter((p) => p.startsWith(`${resource}.`)),
  }))
);
const withRead = (values: string[]) => {
  if (!props.ensureRead) return [...new Set(values)];
  return addPageAccess(values, props.permissions);
};
const remove = (values: string[], removed: string[]) =>
  removePermissions(values, removed, props.ensureRead);
const toggle = (permission: string) =>
  emit(
    'update',
    props.values.includes(permission)
      ? remove(props.values, [permission])
      : withRead([...props.values, permission])
  );
const toggleGroup = (permissions: string[]) =>
  emit(
    'update',
    permissions.every((p) => props.values.includes(p))
      ? remove(props.values, permissions)
      : withRead([...props.values, ...permissions])
  );
const selectVisible = () =>
  emit('update', withRead([...props.values, ...visible.value]));
</script>
