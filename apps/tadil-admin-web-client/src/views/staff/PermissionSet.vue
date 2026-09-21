<template>
  <fieldset>
    <legend class="mb-2 font-medium">{{ label }}</legend>
    <div class="max-h-40 space-y-1 overflow-auto rounded border p-2 text-xs">
      <label v-for="permission in permissions" :key="permission" class="block"
        ><input
          type="checkbox"
          :checked="values.includes(permission)"
          @change="toggle(permission)"
        />
        {{ permission }}</label
      >
    </div>
  </fieldset>
</template>
<script setup lang="ts">
const props = defineProps<{
  label: string;
  values: string[];
  permissions: string[];
}>();
const emit = defineEmits<{ update: [string[]] }>();
const toggle = (permission: string) =>
  emit(
    'update',
    props.values.includes(permission)
      ? props.values.filter((value) => value !== permission)
      : [...props.values, permission]
  );
</script>
