<template>
  <section class="mx-auto max-w-6xl space-y-6">
    <header class="flex flex-wrap items-start justify-between gap-4">
      <div class="flex items-center gap-3">
        <span class="rounded-2xl bg-primary/10 p-3 text-primary"
          ><ShieldCheck class="h-6 w-6"
        /></span>
        <div>
          <h1 class="text-2xl font-bold tracking-tight">
            {{ t('access.roles') }}
          </h1>
          <p class="mt-1 text-sm text-muted-foreground">
            {{ t('access.subtitle') }}
          </p>
        </div>
      </div>
      <Button
        v-if="can('roles.create')"
        :disabled="loading || saving"
        @click="start"
        ><Plus />{{ t('access.newRole') }}</Button
      >
    </header>
    <p
      v-if="notice"
      role="status"
      class="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm"
    >
      {{ t(notice) }}
    </p>
    <div
      v-if="loadError"
      role="alert"
      class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm"
    >
      <span>{{ t('access.loadError') }}</span
      ><Button variant="outline" @click="load">{{ t('access.retry') }}</Button>
    </div>
    <div
      class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4"
    >
      <label class="relative w-full sm:max-w-sm"
        ><Search
          class="pointer-events-none absolute start-3 top-3 h-4 w-4 text-muted-foreground" /><input
          v-model="search"
          type="search"
          :aria-label="t('access.roleSearch')"
          :placeholder="t('access.roleSearch')"
          class="h-10 w-full rounded-lg border border-input bg-background pe-3 ps-9 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      /></label>
      <span class="text-sm text-muted-foreground">{{
        t('access.roleCount', { count: roles.length })
      }}</span>
    </div>
    <p
      v-if="loading"
      role="status"
      class="py-12 text-center text-muted-foreground"
    >
      {{ t('access.loading') }}
    </p>
    <div
      v-else-if="!filteredRoles.length"
      class="rounded-2xl border border-dashed bg-card px-5 py-14 text-center"
    >
      <ShieldCheck class="mx-auto mb-4 h-10 w-10 text-primary/60" />
      <h2 class="font-semibold">
        {{ t(search ? 'access.noMatches' : 'access.emptyTitle') }}
      </h2>
      <p class="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        {{ t(search ? 'access.trySearch' : 'access.emptyHint') }}
      </p>
    </div>
    <div v-else class="grid items-start gap-4 lg:grid-cols-2 xl:grid-cols-3">
      <article
        v-for="role in filteredRoles"
        :key="role.id"
        class="flex h-full min-w-0 flex-col rounded-2xl border bg-card p-5 shadow-sm"
        :class="role.isSystem ? 'border-primary/30' : 'border-border'"
      >
        <div class="mb-4 flex items-start justify-between gap-3">
          <span
            class="rounded-xl p-2.5"
            :class="
              role.isSystem
                ? 'bg-primary/10 text-primary'
                : 'bg-muted text-muted-foreground'
            "
            ><component
              :is="role.isSystem ? ShieldCheck : Shield"
              class="h-5 w-5" /></span
          ><span
            class="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground"
            >{{
              t(role.isSystem ? 'access.protected' : 'access.customRole')
            }}</span
          >
        </div>
        <h2 class="break-words text-lg font-semibold">{{ roleName(role) }}</h2>
        <p class="mt-1 text-sm text-muted-foreground">
          {{ t('access.permissionCount', { count: role.permissions.length }) }}
        </p>
        <p
          v-if="role.isSystem"
          class="mt-4 text-sm leading-relaxed text-muted-foreground"
        >
          {{ t('access.systemHint') }}
        </p>
        <div v-else class="mt-4 flex flex-wrap gap-1.5">
          <span
            v-for="resource in resources(role)"
            :key="resource"
            class="rounded-md bg-accent px-2 py-1 text-xs text-accent-foreground"
            >{{ t(`access.resources.${resource}`) }}</span
          ><span
            v-if="!role.permissions.length"
            class="text-sm text-muted-foreground"
            >{{ t('access.noPermissions') }}</span
          >
        </div>
        <details class="mt-4 text-sm">
          <summary class="cursor-pointer font-medium text-primary">
            {{ t('access.viewPermissions') }}
          </summary>
          <ul class="mt-3 space-y-2 text-xs text-muted-foreground">
            <li v-for="permission in role.permissions" :key="permission">
              {{ permissionLabel(permission) }}
            </li>
            <li v-if="!role.permissions.length">
              {{ t('access.noPermissions') }}
            </li>
          </ul>
        </details>
        <div
          v-if="!role.isSystem && manageable(role)"
          class="mt-auto flex flex-wrap gap-2 pt-5"
        >
          <Button
            v-if="can('roles.update')"
            size="sm"
            variant="outline"
            :disabled="saving"
            :aria-label="`${t('access.edit')} ${roleName(role)}`"
            @click="edit(role)"
            ><Pencil />{{ t('access.edit') }}</Button
          ><Button
            v-if="can('roles.delete')"
            size="sm"
            variant="ghost"
            class="text-destructive"
            :disabled="saving"
            :aria-label="`${t('access.delete')} ${roleName(role)}`"
            @click="confirmDelete(role)"
            ><Trash2 />{{ t('access.delete') }}</Button
          >
        </div>
      </article>
    </div>
    <p
      class="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground"
    >
      <Info class="h-4 w-4 shrink-0" />{{ t('access.limitedAccess') }}
    </p>

    <dialog
      ref="editor"
      aria-labelledby="role-editor-title"
      class="role-dialog w-[min(56rem,calc(100%-2rem))] rounded-2xl border border-border bg-card p-0 text-card-foreground shadow-2xl"
      @cancel="cancelEditor"
      @close="restoreFocus"
    >
      <form @submit.prevent="save">
        <header
          class="flex items-center justify-between gap-4 border-b border-border p-5 sm:px-7"
        >
          <div>
            <p class="text-xs font-medium text-primary">
              {{ t('access.roleDetails') }}
            </p>
            <h2 id="role-editor-title" class="mt-1 text-xl font-bold">
              {{ t(editing ? 'access.editRole' : 'access.newRole') }}
            </h2>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            :disabled="saving"
            :aria-label="t('access.cancel')"
            @click="closeEditor"
            ><X
          /></Button>
        </header>
        <div class="space-y-6 p-5 sm:p-7">
          <p
            v-if="formError"
            role="alert"
            class="rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
          >
            {{ t(formError) }}
          </p>
          <div>
            <label for="role-name" class="mb-2 block text-sm font-medium">{{
              t('access.roleName')
            }}</label
            ><input
              id="role-name"
              ref="nameInput"
              v-model="draft.name"
              required
              maxlength="160"
              :disabled="saving"
              :placeholder="t('access.rolePlaceholder')"
              class="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <p class="mt-2 text-xs text-muted-foreground">
              {{ t('access.roleNameHint') }}
            </p>
          </div>
          <div>
            <p class="mb-4 text-sm text-muted-foreground">
              {{ t('access.permissionsHint') }}
            </p>
            <PermissionSet
              :key="editorVersion"
              :label="t('access.permissions')"
              :permissions="permissions"
              :values="draft.permissions"
              :disabled="saving"
              ensure-read
              @update="draft.permissions = $event"
            />
            <p
              class="mt-4 rounded-lg bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground"
            >
              {{ t('access.dependenciesHint') }}
            </p>
          </div>
        </div>
        <footer
          class="flex flex-wrap justify-end gap-3 border-t border-border bg-card px-5 py-4 sm:px-7"
        >
          <Button
            type="button"
            variant="outline"
            :disabled="saving"
            @click="closeEditor"
            >{{ t('access.cancel') }}</Button
          ><Button type="submit" :disabled="saving || !draft.name.trim()"
            ><Check class="h-4 w-4" />{{
              t(saving ? 'access.saving' : 'access.save')
            }}</Button
          >
        </footer>
      </form>
    </dialog>
    <dialog
      ref="deleteDialog"
      aria-labelledby="delete-role-title"
      class="role-dialog w-[min(28rem,calc(100%-2rem))] rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-2xl"
      @cancel="cancelDelete"
      @close="restoreFocus"
    >
      <div
        class="mb-4 w-fit rounded-full bg-destructive/10 p-3 text-destructive"
      >
        <Trash2 class="h-6 w-6" />
      </div>
      <h2 id="delete-role-title" class="text-xl font-bold">
        {{ t('access.deleteTitle') }}
      </h2>
      <p class="mt-3 text-sm leading-relaxed text-muted-foreground">
        {{ t('access.deleteHint', { name: deletingRole?.name }) }}
      </p>
      <p v-if="deleteError" role="alert" class="mt-4 text-sm text-destructive">
        {{ t('access.deleteError') }}
      </p>
      <div class="mt-6 flex flex-wrap justify-end gap-3">
        <Button
          variant="outline"
          :disabled="saving"
          @click="deleteDialog?.close()"
          >{{ t('access.cancel') }}</Button
        ><Button variant="destructive" :disabled="saving" @click="remove">{{
          t(saving ? 'access.deleting' : 'access.delete')
        }}</Button>
      </div>
    </dialog>
  </section>
</template>
<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  Check,
  Info,
  Pencil,
  Plus,
  Search,
  Shield,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-vue-next';
import { isAxiosError } from 'axios';
import { authHttp, authState, can, type Role } from '@/auth';
import Button from '@/components/ui/Button.vue';
import PermissionSet from './PermissionSet.vue';
const { t } = useI18n();
const roles = ref<Role[]>([]);
// Delegation is limited to the current account; roles.read does not imply staff.read.
const permissions = computed(() => authState.user?.permissions || []);
const search = ref('');
const loading = ref(false);
const saving = ref(false);
const loadError = ref(false);
const notice = ref('');
const formError = ref('');
const deleteError = ref(false);
const editing = ref<string | null>(null);
const deletingRole = ref<Role | null>(null);
const editor = ref<HTMLDialogElement>();
const deleteDialog = ref<HTMLDialogElement>();
const nameInput = ref<HTMLInputElement>();
const editorVersion = ref(0);
let returnFocus: HTMLElement | null = null;
const draft = reactive({ name: '', permissions: [] as string[] });
const roleName = (role: Role) =>
  role.isSystem ? t('access.systemRole') : role.name;
const resources = (role: Role) => [
  ...new Set(role.permissions.map((permission) => permission.split('.')[0])),
];
const permissionLabel = (permission: string) => {
  const [resource, action] = permission.split('.');
  return `${t(`access.resources.${resource}`)} · ${t(
    `access.actions.${action}`
  )}`;
};
const manageable = (role: Role) => role.permissions.every(can);
const filteredRoles = computed(() =>
  roles.value.filter((role) =>
    `${roleName(role)} ${resources(role)
      .map((r) => t(`access.resources.${r}`))
      .join(' ')}`
      .toLocaleLowerCase()
      .includes(search.value.trim().toLocaleLowerCase())
  )
);
const load = async () => {
  loading.value = true;
  loadError.value = false;
  try {
    const { data } = await authHttp.get('/api/staff/roles');
    roles.value = Array.isArray(data) ? data : data.roles || [];
  } catch {
    loadError.value = true;
  } finally {
    loading.value = false;
  }
};
const showEditor = async () => {
  formError.value = '';
  notice.value = '';
  editorVersion.value++;
  returnFocus = document.activeElement as HTMLElement;
  editor.value?.showModal();
  await nextTick();
  nameInput.value?.focus();
};
const start = () => {
  editing.value = null;
  Object.assign(draft, { name: '', permissions: [] });
  void showEditor();
};
const edit = (role: Role) => {
  editing.value = role.id;
  Object.assign(draft, { name: role.name, permissions: [...role.permissions] });
  void showEditor();
};
const restoreFocus = () => returnFocus?.focus();
const closeEditor = () => {
  if (!saving.value) editor.value?.close();
};
const cancelEditor = (event: Event) => {
  if (saving.value) event.preventDefault();
};
const cancelDelete = (event: Event) => {
  if (saving.value) event.preventDefault();
};
const save = async () => {
  if (saving.value || !draft.name.trim()) return;
  saving.value = true;
  formError.value = '';
  try {
    const payload = { name: draft.name.trim(), permissions: draft.permissions };
    if (editing.value)
      await authHttp.patch(`/api/staff/roles/${editing.value}`, payload);
    else await authHttp.post('/api/staff/roles', payload);
    editor.value?.close();
    notice.value = 'access.saved';
    await load();
  } catch (error) {
    formError.value =
      isAxiosError(error) && error.response?.status === 409
        ? 'access.duplicateError'
        : 'access.saveError';
  } finally {
    saving.value = false;
  }
};
const confirmDelete = (role: Role) => {
  deletingRole.value = role;
  deleteError.value = false;
  returnFocus = document.activeElement as HTMLElement;
  deleteDialog.value?.showModal();
};
const remove = async () => {
  if (saving.value || !deletingRole.value) return;
  saving.value = true;
  deleteError.value = false;
  try {
    await authHttp.delete(`/api/staff/roles/${deletingRole.value.id}`);
    deleteDialog.value?.close();
    notice.value = 'access.deleted';
    await load();
  } catch {
    deleteError.value = true;
  } finally {
    saving.value = false;
  }
};
onMounted(load);
</script>
<style scoped>
.role-dialog {
  margin: auto;
  max-height: 90dvh;
}
.role-dialog::backdrop {
  background: rgb(20 8 13 / 55%);
  backdrop-filter: blur(4px);
}
</style>
