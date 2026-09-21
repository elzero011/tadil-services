<template>
  <section class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-semibold">Roles</h1>
      <button
        v-if="can('roles.create')"
        class="rounded bg-primary px-4 py-2 text-primary-foreground"
        @click="start"
      >
        New role
      </button>
    </div>
    <p v-if="message" class="text-sm">{{ message }}</p>
    <div class="grid gap-4 md:grid-cols-2">
      <article
        v-for="role in roles"
        :key="role.id"
        class="rounded-xl bg-background p-5 shadow"
      >
        <input
          v-if="editing === role.id"
          v-model="draft.name"
          class="rounded border p-2"
        />
        <h2 v-else class="font-semibold">{{ role.name }}</h2>
        <p class="mt-2 text-sm text-muted-foreground">
          {{ role.permissions.join(', ') || 'No permissions' }}
        </p>
        <div class="mt-3 flex gap-3">
          <button
            v-if="can('roles.update') && !role.isSystem"
            class="underline"
            @click="edit(role)"
          >
            Edit</button
          ><button
            v-if="can('roles.delete') && !role.isSystem"
            class="underline text-destructive"
            @click="remove(role)"
          >
            Delete
          </button>
        </div>
      </article>
    </div>
    <form
      v-if="creating"
      class="space-y-3 rounded-xl bg-background p-5 shadow"
      @submit.prevent="save"
    >
      <input
        v-model="draft.name"
        required
        placeholder="Role name"
        class="rounded border p-2"
      />
      <div class="max-h-48 overflow-auto">
        <label
          v-for="permission in permissions"
          :key="permission"
          class="block text-xs"
          ><input
            v-model="draft.permissions"
            type="checkbox"
            :value="permission"
          />
          {{ permission }}</label
        >
      </div>
      <button class="rounded bg-primary px-4 py-2 text-primary-foreground">
        Save role
      </button>
    </form>
  </section>
</template>
<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { authHttp, can } from '@/auth';
const roles = ref<any[]>([]);
const permissions = ref<string[]>([]);
const creating = ref(false);
const editing = ref<string | null>(null);
const message = ref('');
const draft = reactive({ name: '', permissions: [] as string[] });
const load = async () => {
  const roleResponse = await authHttp.get('/api/staff/roles');
  roles.value = Array.isArray(roleResponse.data)
    ? roleResponse.data
    : roleResponse.data.roles || [];
  const permissionResponse = await authHttp.get('/api/staff/permissions');
  permissions.value = permissionResponse.data.permissions || [];
};
const start = () => {
  Object.assign(draft, { name: '', permissions: [] });
  creating.value = true;
  editing.value = null;
};
const edit = (role: any) => {
  Object.assign(draft, { name: role.name, permissions: [...role.permissions] });
  editing.value = role.id;
  creating.value = true;
};
const save = async () => {
  try {
    if (editing.value)
      await authHttp.patch(`/api/staff/roles/${editing.value}`, draft);
    else await authHttp.post('/api/staff/roles', draft);
    creating.value = false;
    editing.value = null;
    await load();
  } catch {
    message.value = 'Unable to save role.';
  }
};
const remove = async (role: any) => {
  if (!window.confirm(`Delete ${role.name}?`)) return;
  try {
    await authHttp.delete(`/api/staff/roles/${role.id}`);
    await load();
  } catch {
    message.value = 'Unable to delete role.';
  }
};
onMounted(load);
</script>
