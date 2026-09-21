<template>
  <section class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-semibold">Staff</h1>
      <button
        v-if="can('staff.create')"
        :disabled="loading"
        class="rounded bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
        @click="startCreate"
      >
        Invite staff
      </button>
    </div>
    <p v-if="message" class="text-sm">{{ message }}</p>
    <div v-if="token" class="space-y-2 rounded border p-3">
      <label class="block text-sm" for="invitation-link"
        >One-time link — share only with the intended recipient</label
      >
      <input
        id="invitation-link"
        readonly
        :value="link(token)"
        class="w-full rounded border p-2 text-sm"
      />
      <button class="rounded border px-3 py-1 text-sm" @click="copyLink(token)">
        Copy invitation link
      </button>
    </div>
    <div class="grid gap-6 lg:grid-cols-[1fr_24rem]">
      <div class="overflow-auto rounded-xl bg-background shadow">
        <table class="w-full text-left text-sm">
          <thead>
            <tr class="border-b">
              <th class="p-4">Name</th>
              <th class="p-4">Email</th>
              <th class="p-4">Status</th>
              <th class="p-4">Effective permissions</th>
              <th class="p-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in users" :key="user.id" class="border-b">
              <td class="p-4">{{ user.name }}</td>
              <td class="p-4">{{ user.email }}</td>
              <td class="p-4">{{ user.active ? 'Active' : 'Inactive' }}</td>
              <td class="p-4">{{ user.effectivePermissions?.length || 0 }}</td>
              <td class="space-x-2 p-4">
                <button
                  v-if="can('staff.update')"
                  :disabled="loading"
                  class="underline"
                  @click="edit(user)"
                >
                  {{ user.active ? 'Edit' : 'View' }}</button
                ><button
                  v-if="can('staff.update')"
                  :disabled="loading"
                  class="underline"
                  @click="toggleActive(user)"
                >
                  {{ user.active ? 'Disable' : 'Enable' }}</button
                ><button
                  v-if="can('staff.update')"
                  :disabled="loading"
                  class="underline"
                  @click="reset(user)"
                >
                  {{ user.active ? 'Reset password' : 'Reissue invitation' }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <form
        v-if="editing"
        class="space-y-4 rounded-xl bg-background p-5 shadow"
        @submit.prevent="save"
      >
        <h2 class="font-semibold">
          {{ editing.id ? 'Edit staff account' : 'Invite staff account' }}
        </h2>
        <input
          v-model="form.email"
          :disabled="!!editing.id"
          required
          type="email"
          placeholder="Email"
          class="w-full rounded border p-2"
        /><input
          v-model="form.name"
          required
          placeholder="Name"
          class="w-full rounded border p-2"
        />
        <fieldset v-if="can('roles.read')">
          <legend class="mb-2 font-medium">Roles</legend>
          <label v-for="role in roles" :key="role.id" class="block"
            ><input v-model="form.roleIds" type="checkbox" :value="role.id" />
            {{ role.name }}</label
          >
        </fieldset>
        <div v-if="editing.id" class="rounded border p-3 text-xs">
          <p class="font-medium">Effective permissions (read-only)</p>
          <p>{{ editing.effectivePermissions?.join(', ') || 'None' }}</p>
          <p class="mt-2 font-medium">Inherited from roles</p>
          <p>
            {{
              roles
                .filter((role) => (editing.roleIds || []).includes(role.id))
                .map((role) => `${role.name}: ${role.permissions.join(', ')}`)
                .join(' · ') || 'None'
            }}
          </p>
        </div>
        <PermissionSet
          label="Direct grants"
          :permissions="permissions"
          :values="form.grants"
          @update="form.grants = $event"
        /><PermissionSet
          label="Direct denials"
          :permissions="permissions"
          :values="form.denials"
          @update="form.denials = $event"
        />
        <div class="flex gap-2">
          <button
            v-if="
              (!editing.id && can('staff.create')) ||
              (editing.id && can('staff.update'))
            "
            class="rounded bg-primary px-4 py-2 text-primary-foreground"
            :disabled="loading"
          >
            Save</button
          ><button
            type="button"
            class="rounded border px-4 py-2"
            @click="editing = null"
          >
            Cancel
          </button>
        </div>
        <p class="text-xs text-muted-foreground">
          Invitation/reset tokens are shown once for secure manual delivery; no
          email is sent.
        </p>
      </form>
    </div>
  </section>
</template>
<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { authHttp, can } from '@/auth';
import PermissionSet from './PermissionSet.vue';
const users = ref<any[]>([]);
const roles = ref<any[]>([]);
const permissions = ref<string[]>([]);
const editing = ref<any>(null);
const loading = ref(false);
const token = ref('');
const message = ref('');
const form = reactive({
  email: '',
  name: '',
  roleIds: [] as string[],
  grants: [] as string[],
  denials: [] as string[],
});
const link = (token: string) =>
  `${window.location.origin}/accept-invitation#token=${encodeURIComponent(
    token
  )}`;
const copyLink = async (token: string) => {
  try {
    await navigator.clipboard.writeText(link(token));
    message.value = 'Invitation link copied.';
  } catch {
    message.value = 'Copy the one-time link from the field above.';
  }
};
const errorMessage = (error: any) =>
  error.response?.data?.message || 'Unable to save staff account.';
const load = async () => {
  loading.value = true;
  try {
    const response = await authHttp.get('/api/staff/users');
    users.value = Array.isArray(response.data)
      ? response.data
      : response.data.users || [];
    const catalog = await authHttp.get('/api/staff/permissions');
    permissions.value = catalog.data.permissions || [];
    if (can('roles.read')) {
      const roleResponse = await authHttp.get('/api/staff/roles');
      roles.value = Array.isArray(roleResponse.data)
        ? roleResponse.data
        : roleResponse.data.roles || [];
    }
  } catch (error) {
    message.value = errorMessage(error);
  } finally {
    loading.value = false;
  }
};
const startCreate = () => {
  token.value = '';
  Object.assign(form, {
    email: '',
    name: '',
    roleIds: [],
    grants: [],
    denials: [],
  });
  editing.value = {};
  message.value = '';
};
const edit = (user: any) => {
  token.value = '';
  Object.assign(form, {
    email: user.email,
    name: user.name,
    roleIds: [...(user.roleIds || [])],
    grants: [...(user.grants || [])],
    denials: [...(user.denials || [])],
  });
  editing.value = user;
  message.value = '';
};
const save = async () => {
  loading.value = true;
  try {
    const payload = {
      name: form.name,
      roleIds: form.roleIds,
      grants: form.grants,
      denials: form.denials,
    };
    const response = editing.value.id
      ? await authHttp.patch(`/api/staff/users/${editing.value.id}`, payload)
      : await authHttp.post('/api/staff/users', {
          email: form.email,
          ...payload,
        });
    const invitationToken = response.data.invitationToken;
    if (invitationToken) {
      token.value = invitationToken;
      message.value = `Invitation link ready for secure manual delivery.`;
    } else message.value = 'Staff account updated.';
    editing.value = null;
    await load();
  } catch (error) {
    message.value = errorMessage(error);
  } finally {
    loading.value = false;
  }
};
const toggleActive = async (user: any) => {
  loading.value = true;
  try {
    await authHttp.patch(`/api/staff/users/${user.id}`, {
      active: !user.active,
    });
    await load();
  } catch (error) {
    message.value = errorMessage(error);
  } finally {
    loading.value = false;
  }
};
const reset = async (user: any) => {
  loading.value = true;
  try {
    const { data } = await authHttp.post(
      `/api/staff/users/${user.id}/${
        user.active ? 'reset-password' : 'invitation'
      }`
    );
    message.value = 'Reset link ready for secure manual delivery.';
    token.value = data.invitationToken;
  } catch (error) {
    message.value = errorMessage(error);
  } finally {
    loading.value = false;
  }
};
onMounted(load);
</script>
