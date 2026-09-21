<template>
  <section class="staff-page">
    <header class="hero-card">
      <div>
        <p class="eyebrow">{{ t('staff.eyebrow') }}</p>
        <h1>{{ t('staff.title') }}</h1>
        <p class="hero-copy">{{ t('staff.subtitle') }}</p>
      </div>
      <button
        v-if="can('staff.create')"
        class="primary-button"
        :disabled="busy || loading || loadFailed"
        @click="startCreate"
      >
        <span aria-hidden="true">＋</span> {{ t('staff.invite') }}
      </button>
    </header>

    <div
      v-if="message"
      class="notice"
      :class="{ error: hasError }"
      role="status"
    >
      {{ message }}
    </div>
    <div
      v-if="loadFailed"
      class="notice error flex flex-wrap items-center justify-between gap-3"
      role="alert"
    >
      <span>{{ t('staff.genericError') }}</span>
      <button class="secondary-button" :disabled="loading" @click="load">
        {{ t('access.retry') }}
      </button>
    </div>

    <div v-if="token" class="invite-result">
      <div>
        <p class="section-kicker">{{ t('staff.invitationReady') }}</p>
        <p>{{ t('staff.invitationHint') }}</p>
      </div>
      <div class="invite-actions">
        <input
          id="invitation-link"
          readonly
          :value="link(token)"
          :aria-label="t('staff.invitationLink')"
        />
        <button class="secondary-button" @click="copyLink(token)">
          {{ t('staff.copyLink') }}
        </button>
      </div>
    </div>

    <div class="toolbar-card">
      <label class="search-box">
        <span aria-hidden="true">⌕</span>
        <span class="sr-only">{{ t('staff.search') }}</span>
        <input
          v-model="query"
          type="search"
          :placeholder="t('staff.searchPlaceholder')"
        />
      </label>
      <label class="filter-box">
        <span>{{ t('staff.filter') }}</span>
        <select v-model="statusFilter">
          <option value="all">{{ t('staff.filters.all') }}</option>
          <option value="active">{{ t('staff.filters.active') }}</option>
          <option value="inactive">{{ t('staff.filters.inactive') }}</option>
        </select>
      </label>
      <span class="result-count">{{
        t('staff.resultCount', { count: filteredUsers.length })
      }}</span>
    </div>

    <div v-if="loading" class="empty-card">{{ t('staff.loading') }}</div>
    <div v-else-if="!filteredUsers.length" class="empty-card">
      <strong>{{ t('staff.emptyTitle') }}</strong
      ><span>{{ t('staff.emptyCopy') }}</span>
    </div>
    <div v-else class="staff-list">
      <article v-for="user in filteredUsers" :key="user.id" class="staff-card">
        <div class="person">
          <div class="avatar">{{ initials(user) }}</div>
          <div class="person-copy">
            <h2>{{ user.name || t('staff.unnamed') }}</h2>
            <p>{{ user.email }}</p>
          </div>
        </div>
        <div class="status-cell">
          <span class="status-pill" :class="statusClass(user)">{{
            statusLabel(user)
          }}</span
          ><small>{{
            roleNames(user).join(' · ') || t('staff.noRoles')
          }}</small>
        </div>
        <div class="permissions-cell">
          <strong>{{ user.effectivePermissions?.length || 0 }}</strong
          ><span>{{ t('staff.permissionsLabel') }}</span
          ><small>{{ permissionPreview(user) }}</small>
        </div>
        <div class="card-actions">
          <button
            v-if="can('staff.update') && canManageUser(user)"
            class="secondary-button"
            :disabled="busy || loading || loadFailed"
            @click="edit(user)"
          >
            {{ user.active ? t('staff.edit') : t('staff.view') }}
          </button>
          <button
            v-if="can('staff.update') && canManageUser(user)"
            class="icon-button"
            :disabled="busy || loading || loadFailed"
            :title="user.active ? t('staff.disable') : t('staff.enable')"
            @click="toggleActive(user)"
          >
            {{ user.active ? t('staff.disable') : t('staff.enable') }}
          </button>
          <button
            v-if="can('staff.update') && canManageUser(user)"
            class="icon-button"
            :disabled="busy || loading || loadFailed"
            @click="reset(user)"
          >
            {{ user.active ? t('staff.resetPassword') : t('staff.reissue') }}
          </button>
        </div>
      </article>
    </div>

    <dialog
      ref="editorDialog"
      class="editor-dialog"
      aria-labelledby="staff-editor-title"
      @close="restoreFocus"
      @cancel="handleCancel"
    >
      <form v-if="editing" class="editor-card" @submit.prevent="save">
        <div class="editor-heading">
          <div>
            <p class="section-kicker">
              {{ editing.id ? t('staff.editKicker') : t('staff.inviteKicker') }}
            </p>
            <h2 id="staff-editor-title">
              {{ editing.id ? t('staff.editTitle') : t('staff.inviteTitle') }}
            </h2>
          </div>
          <button
            type="button"
            class="close-button"
            :disabled="busy"
            :aria-label="t('staff.close')"
            @click="closeEditor"
          >
            ×
          </button>
        </div>
        <p v-if="editorError" class="notice error" role="alert">
          {{ editorError }}
        </p>
        <div class="form-grid">
          <label
            >{{ t('staff.name')
            }}<input
              v-model="form.name"
              required
              :disabled="busy"
              :placeholder="t('staff.namePlaceholder')" /></label
          ><label
            >{{ t('staff.email')
            }}<input
              v-model="form.email"
              required
              type="email"
              :disabled="busy || !!editing.id"
              :placeholder="t('staff.emailPlaceholder')"
          /></label>
        </div>
        <fieldset v-if="can('roles.read')" :disabled="busy">
          <legend>{{ t('staff.roles') }}</legend>
          <div class="choice-grid">
            <label v-for="role in roles" :key="role.id" class="choice"
              ><input
                v-model="form.roleIds"
                type="checkbox"
                :value="role.id"
                :disabled="!canAssignRole(role)"
              />
              <span>{{
                role.isSystem ? t('access.systemRole') : role.name
              }}</span></label
            >
          </div>
        </fieldset>
        <details v-if="editing.id" class="permission-details">
          <summary>{{ t('staff.permissionSummary') }}</summary>
          <div class="permission-summary">
            <div>
              <strong>{{ t('staff.effectivePermissions') }}</strong
              ><span>{{
                displayPermissions(editing.effectivePermissions)
              }}</span>
            </div>
            <div>
              <strong>{{ t('staff.inheritedPermissions') }}</strong
              ><span>{{ inheritedPermissions(editing) }}</span>
            </div>
          </div>
        </details>
        <p v-if="systemTarget" class="helper-text">
          {{ t('access.systemHint') }}
        </p>
        <details v-else class="permission-details">
          <summary>{{ t('staff.advancedAccess') }}</summary>
          <div class="access-grid">
            <PermissionSet
              :label="t('staff.directGrants')"
              :permissions="grantablePermissions"
              :values="form.grants"
              :disabled="busy"
              @update="form.grants = $event"
            />
            <div>
              <PermissionSet
                :label="t('staff.directDenials')"
                :permissions="grantablePermissions"
                :values="form.denials"
                :disabled="busy"
                @update="form.denials = $event"
              />
              <p class="denial-note">{{ t('staff.denialNotice') }}</p>
            </div>
          </div>
        </details>
        <div class="editor-actions">
          <button
            type="button"
            class="secondary-button"
            :disabled="busy"
            @click="editing = null"
          >
            {{ t('staff.cancel') }}</button
          ><button
            v-if="
              (!editing.id && can('staff.create')) ||
              (editing.id && can('staff.update'))
            "
            class="primary-button"
            :disabled="busy"
          >
            {{ busy ? t('staff.saving') : t('staff.save') }}
          </button>
        </div>
        <p class="helper-text">{{ t('staff.tokenNotice') }}</p>
      </form>
    </dialog>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { authHttp, authState, can } from '@/auth';
import PermissionSet from './PermissionSet.vue';

const { t } = useI18n();
const users = ref<any[]>([]);
const roles = ref<any[]>([]);
const permissions = ref<string[]>([]);
const editing = ref<any>(null);
const loading = ref(false);
const loadFailed = ref(false);
const busy = ref(false);
const token = ref('');
const messageKey = ref('');
const messageParams = ref<Record<string, string>>({});
const rawMessage = ref('');
const message = computed(
  () =>
    rawMessage.value ||
    (messageKey.value ? t(messageKey.value, messageParams.value) : '')
);
const notify = (key: string, params: Record<string, string> = {}) => {
  rawMessage.value = '';
  messageKey.value = key;
  messageParams.value = params;
};
const notifyRaw = (value: string) => {
  messageKey.value = '';
  rawMessage.value = value;
};
const hasError = ref(false);
const editorError = ref('');
const query = ref('');
const statusFilter = ref('all');
const editorDialog = ref<HTMLDialogElement | null>(null);
let returnFocus: HTMLElement | null = null;
const restoreFocus = () => returnFocus?.focus();
const form = reactive({
  email: '',
  name: '',
  roleIds: [] as string[],
  grants: [] as string[],
  denials: [] as string[],
});
const resetForm = (user: any = {}) =>
  Object.assign(form, {
    email: user.email || '',
    name: user.name || '',
    roleIds: [...(user.roleIds || [])],
    grants: [...(user.grants || [])],
    denials: [...(user.denials || [])],
  });
const status = (user: any) => (user.active ? 'active' : 'inactive');
const filteredUsers = computed(() =>
  users.value.filter(
    (user) =>
      `${user.name || ''} ${user.email || ''}`
        .toLowerCase()
        .includes(query.value.toLowerCase()) &&
      (statusFilter.value === 'all' || status(user) === statusFilter.value)
  )
);
const keyFor = (value: string) => value.replace(/[.:\-]/g, '_');
const accessLabel = (value: string, section: 'resources' | 'actions') => {
  const translated = t(`access.${section}.${keyFor(value)}`);
  return translated === `access.${section}.${keyFor(value)}` ? '' : translated;
};
const permissionLabel = (value: string) => {
  const [resource, action] = value.split(/[.:]/);
  const resourceLabel = accessLabel(resource || value, 'resources');
  const actionLabel = accessLabel(action || '', 'actions');
  return resourceLabel && actionLabel
    ? `${resourceLabel} · ${actionLabel}`
    : resourceLabel ||
        actionLabel ||
        (t(`staff.permissions.${keyFor(value)}`) ===
        `staff.permissions.${keyFor(value)}`
          ? value
              .split(/[.:_-]/)
              .map((part) => part[0]?.toUpperCase() + part.slice(1))
              .join(' ')
          : t(`staff.permissions.${keyFor(value)}`));
};
const grantablePermissions = computed(() =>
  permissions.value.filter((permission) => can(permission))
);
const canAssignRole = (role: any) =>
  (!role.isSystem || !!authState.user?.isSystemAdmin) &&
  role.permissions.every(can);
const canManageUser = (user: any) =>
  (!user.isSystemAdmin || !!authState.user?.isSystemAdmin) &&
  (user.effectivePermissions || []).every(can);
const systemTarget = computed(
  () =>
    roles.value.some(
      (role) => role.isSystem && form.roleIds.includes(role.id)
    ) ||
    (!can('roles.read') && !!editing.value?.isSystemAdmin)
);
watch(systemTarget, (value) => {
  if (value) form.denials = [];
});
const displayPermissions = (values?: string[]) =>
  values?.length ? values.map(permissionLabel).join(', ') : t('staff.none');
const permissionPreview = (user: any) =>
  user.effectivePermissions?.length
    ? user.effectivePermissions.slice(0, 2).map(permissionLabel).join(', ') +
      (user.effectivePermissions.length > 2 ? '…' : '')
    : t('staff.none');
const roleNames = (user: any) =>
  roles.value
    .filter((role) => (user.roleIds || []).includes(role.id))
    .map((role) => (role.isSystem ? t('access.systemRole') : role.name));
const inheritedPermissions = (user: any) =>
  displayPermissions(
    roles.value
      .filter((role) => (user.roleIds || []).includes(role.id))
      .flatMap((role) => role.permissions || [])
  );
const initials = (user: any) =>
  (user.name || user.email || '?')
    .split(/\s+/)
    .slice(0, 2)
    .map((part: string) => part[0])
    .join('')
    .toUpperCase();
const statusLabel = (user: any) => t(`staff.status.${status(user)}`);
const statusClass = (user: any) => `status-${status(user)}`;
const link = (value: string) =>
  `${window.location.origin}/accept-invitation#token=${encodeURIComponent(
    value
  )}`;
const errorMessage = (_error: any) => t('staff.genericError');
const load = async () => {
  loading.value = true;
  loadFailed.value = false;
  try {
    const [response, catalog, roleResponse] = await Promise.all([
      authHttp.get('/api/staff/users'),
      authHttp.get('/api/staff/permissions'),
      can('roles.read')
        ? authHttp.get('/api/staff/roles')
        : Promise.resolve({ data: [] }),
    ]);
    users.value = Array.isArray(response.data)
      ? response.data
      : response.data.users || [];
    permissions.value = catalog.data.permissions || [];
    roles.value = Array.isArray(roleResponse.data)
      ? roleResponse.data
      : roleResponse.data.roles || [];
  } catch {
    loadFailed.value = true;
  } finally {
    loading.value = false;
  }
};
const closeEditor = () => {
  if (busy.value) return;
  editorDialog.value?.close();
  editing.value = null;
};
const handleCancel = (event: Event) => {
  if (busy.value) event.preventDefault();
  else closeEditor();
};
watch(editing, async (value) => {
  await nextTick();
  if (value && editorDialog.value && !editorDialog.value.open) {
    editorDialog.value.showModal();
    editorDialog.value.querySelector<HTMLInputElement>('input')?.focus();
  } else if (!value && editorDialog.value?.open) editorDialog.value.close();
});
const startCreate = () => {
  if (busy.value || loading.value || loadFailed.value) return;
  returnFocus = document.activeElement as HTMLElement;
  token.value = '';
  resetForm();
  editing.value = {};
  editorError.value = '';
  notifyRaw('');
  hasError.value = false;
};
const edit = (user: any) => {
  if (busy.value || loading.value || loadFailed.value) return;
  returnFocus = document.activeElement as HTMLElement;
  token.value = '';
  resetForm(user);
  editing.value = user;
  editorError.value = '';
  notifyRaw('');
  hasError.value = false;
};
const save = async () => {
  if (busy.value || !editing.value) return;
  busy.value = true;
  editorError.value = '';
  hasError.value = false;
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
    if (response.data.invitationToken) {
      token.value = response.data.invitationToken;
      notify('staff.invitationSuccess');
    } else notify('staff.updateSuccess');
    editorDialog.value?.close();
    editing.value = null;
    await load();
  } catch (error) {
    hasError.value = true;
    editorError.value = errorMessage(error);
  } finally {
    busy.value = false;
  }
};
const toggleActive = async (user: any) => {
  if (busy.value) return;
  if (
    !window.confirm(
      t(user.active ? 'staff.confirmDisable' : 'staff.confirmEnable', {
        name: user.name,
      })
    )
  )
    return;
  busy.value = true;
  hasError.value = false;
  try {
    await authHttp.patch(`/api/staff/users/${user.id}`, {
      active: !user.active,
    });
    notify(user.active ? 'staff.disabled' : 'staff.enabled', {
      name: user.name,
    });
    await load();
  } catch (error) {
    hasError.value = true;
    notifyRaw(errorMessage(error));
  } finally {
    busy.value = false;
  }
};
const reset = async (user: any) => {
  if (busy.value) return;
  busy.value = true;
  hasError.value = false;
  try {
    const { data } = await authHttp.post(
      `/api/staff/users/${user.id}/${
        user.active ? 'reset-password' : 'invitation'
      }`
    );
    token.value = data.invitationToken;
    notify('staff.linkReady');
  } catch (error) {
    hasError.value = true;
    notifyRaw(errorMessage(error));
  } finally {
    busy.value = false;
  }
};
const copyLink = async (value: string) => {
  try {
    await navigator.clipboard.writeText(link(value));
    notify('staff.copied');
  } catch {
    notify('staff.copyFallback');
  }
};
onMounted(load);
</script>

<style scoped>
.staff-page {
  color: hsl(var(--foreground));
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  max-width: 72rem;
  margin: auto;
}
.hero-card,
.toolbar-card,
.staff-card,
.editor-card,
.invite-result,
.empty-card {
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: 18px;
  box-shadow: 0 8px 24px hsl(var(--primary) / 0.05);
}
.hero-card {
  background: hsl(var(--card));
  color: hsl(var(--foreground));
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: clamp(1.3rem, 3vw, 2.25rem);
}
.eyebrow,
.section-kicker {
  color: hsl(var(--primary));
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  margin: 0 0 0.45rem;
}
.hero-card h1 {
  font-size: clamp(1.5rem, 3vw, 2.15rem);
  font-weight: 700;
  margin: 0;
}
.hero-copy {
  color: hsl(var(--muted-foreground));
  margin: 0.45rem 0 0;
}
.primary-button,
.secondary-button,
.icon-button {
  border-radius: 10px;
  cursor: pointer;
  font-weight: 700;
  transition: opacity 0.2s, transform 0.2s;
}
.primary-button {
  background: hsl(var(--primary));
  border: 0;
  color: hsl(var(--primary-foreground));
  padding: 0.72rem 1rem;
  white-space: nowrap;
}
.secondary-button {
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  color: hsl(var(--primary));
  padding: 0.55rem 0.8rem;
}
.icon-button {
  background: transparent;
  border: 0;
  color: hsl(var(--primary));
  padding: 0.55rem;
}
.primary-button:disabled,
.secondary-button:disabled,
.icon-button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}
.notice {
  background: hsl(var(--accent) / 0.12);
  border: 1px solid hsl(var(--accent));
  border-radius: 10px;
  color: hsl(var(--foreground));
  padding: 0.8rem 1rem;
}
.notice.error {
  background: hsl(var(--destructive) / 0.1);
  border-color: hsl(var(--destructive));
  color: hsl(var(--destructive));
}
.toolbar-card {
  align-items: center;
  display: flex;
  gap: 1rem;
  padding: 0.8rem 1rem;
}
.search-box {
  align-items: center;
  border: 1px solid hsl(var(--border));
  border-radius: 10px;
  display: flex;
  flex: 1;
  gap: 0.55rem;
  padding: 0.55rem 0.75rem;
}
.search-box input {
  background: transparent;
  border: 0;
  color: hsl(var(--foreground));
  outline: 0;
  width: 100%;
}
.filter-box {
  align-items: center;
  color: hsl(var(--muted-foreground));
  display: flex;
  gap: 0.5rem;
  font-size: 0.8rem;
}
.filter-box select {
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  color: hsl(var(--foreground));
  padding: 0.5rem;
}
.result-count {
  color: hsl(var(--muted-foreground));
  font-size: 0.8rem;
  white-space: nowrap;
}
.staff-list {
  display: grid;
  gap: 0.75rem;
}
.staff-card {
  align-items: center;
  display: grid;
  gap: 1rem;
  grid-template-columns: minmax(0, 1.4fr) minmax(0, 0.8fr) minmax(0, 0.8fr) auto;
  padding: 1rem 1.15rem;
}
.person {
  align-items: center;
  display: flex;
  gap: 0.8rem;
  min-width: 0;
}
.avatar {
  align-items: center;
  background: hsl(var(--accent) / 0.15);
  border-radius: 12px;
  color: hsl(var(--primary));
  display: flex;
  flex: 0 0 42px;
  font-size: 0.8rem;
  font-weight: 700;
  height: 42px;
  justify-content: center;
}
.person-copy {
  min-width: 0;
}
.person h2 {
  font-size: 1rem;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.person p,
.status-cell small,
.permissions-cell small {
  color: hsl(var(--muted-foreground));
  font-size: 0.78rem;
  margin: 0.2rem 0 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.status-cell,
.permissions-cell {
  display: flex;
  flex-direction: column;
}
.status-pill {
  align-self: flex-start;
  border-radius: 99px;
  font-size: 0.72rem;
  font-weight: 700;
  padding: 0.3rem 0.55rem;
}
.status-active {
  background: hsl(var(--accent) / 0.18);
  color: hsl(var(--foreground));
}
.status-inactive {
  background: hsl(var(--muted));
  color: hsl(var(--muted-foreground));
}
.permissions-cell strong {
  color: hsl(var(--primary));
  font-size: 1.2rem;
}
.permissions-cell span {
  font-size: 0.72rem;
  font-weight: 700;
}
.card-actions {
  align-items: center;
  display: flex;
  gap: 0.2rem;
  justify-content: flex-end;
}
.empty-card {
  align-items: center;
  color: hsl(var(--muted-foreground));
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  padding: 3rem 1rem;
  text-align: center;
}
.empty-card strong {
  color: hsl(var(--foreground));
}
.invite-result {
  align-items: center;
  background: hsl(var(--accent) / 0.08);
  display: flex;
  gap: 1rem;
  justify-content: space-between;
  padding: 1rem 1.2rem;
}
.invite-result p {
  margin: 0;
}
.invite-result > div:first-child p:last-child {
  color: hsl(var(--muted-foreground));
  font-size: 0.85rem;
}
.invite-actions {
  display: flex;
  gap: 0.5rem;
  max-width: 560px;
  width: 50%;
}
.invite-actions input {
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  color: hsl(var(--foreground));
  min-width: 0;
  padding: 0.5rem;
  width: 100%;
}
.editor-dialog {
  background: transparent;
  border: 0;
  margin: auto;
  max-height: 92vh;
  max-width: 700px;
  padding: 0;
  width: calc(100% - 2rem);
}
.editor-dialog::backdrop {
  background: hsl(var(--foreground) / 0.5);
}
.editor-card {
  max-height: 92vh;
  overflow: auto;
  padding: clamp(1.2rem, 3vw, 2rem);
  width: 100%;
}
.editor-heading {
  align-items: flex-start;
  display: flex;
  justify-content: space-between;
  margin-bottom: 1.5rem;
}
.editor-heading h2 {
  font-size: 1.4rem;
  margin: 0;
}
.close-button {
  background: none;
  border: 0;
  color: hsl(var(--muted-foreground));
  cursor: pointer;
  font-size: 1.7rem;
  line-height: 1;
}
.close-button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}
.form-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
}
.form-grid label,
fieldset {
  color: hsl(var(--foreground));
  display: flex;
  flex-direction: column;
  font-size: 0.8rem;
  font-weight: 700;
  gap: 0.4rem;
}
.form-grid input {
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  color: hsl(var(--foreground));
  font: inherit;
  font-weight: 400;
  padding: 0.65rem;
}
.form-grid input:focus,
.invite-actions input:focus,
.search-box:focus-within {
  border-color: hsl(var(--primary));
  outline: 2px solid hsl(var(--primary) / 0.15);
}
.choice-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.3rem;
}
.choice {
  align-items: center;
  background: hsl(var(--accent) / 0.08);
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  display: flex;
  flex-direction: row;
  padding: 0.55rem 0.7rem;
}
.permission-details {
  border-top: 1px solid hsl(var(--border));
  margin-top: 1.25rem;
  padding-top: 1rem;
}
.permission-details summary {
  color: hsl(var(--primary));
  cursor: pointer;
  font-weight: 700;
}
.permission-summary {
  display: grid;
  gap: 0.8rem;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  margin-top: 1rem;
}
.permission-summary div {
  background: hsl(var(--accent) / 0.08);
  border-radius: 8px;
  padding: 0.75rem;
}
.permission-summary strong,
.permission-summary span {
  display: block;
  font-size: 0.78rem;
}
.permission-summary span {
  color: hsl(var(--muted-foreground));
  margin-top: 0.3rem;
}
.access-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: minmax(0, 1fr);
  margin-top: 1rem;
}
.denial-note {
  color: hsl(var(--muted-foreground));
  font-size: 0.75rem;
  margin: 0.5rem 0 0;
}
.editor-actions {
  display: flex;
  gap: 0.6rem;
  justify-content: flex-end;
  margin-top: 1.5rem;
}
.editor-actions .primary-button {
  background: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
}
.helper-text {
  color: hsl(var(--muted-foreground));
  font-size: 0.72rem;
}
.sr-only {
  height: 1px;
  margin: -1px;
  overflow: hidden;
  position: absolute;
  width: 1px;
}
@media (max-width: 1279px) {
  .staff-card {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  }
  .card-actions {
    grid-column: 1 / -1;
    justify-content: flex-start;
  }
}
@media (max-width: 800px) {
  .hero-card,
  .toolbar-card,
  .invite-result {
    align-items: stretch;
    flex-direction: column;
  }
  .toolbar-card {
    gap: 0.7rem;
  }
  .invite-actions {
    max-width: none;
    width: 100%;
  }
  .staff-card {
    grid-template-columns: minmax(0, 1fr);
  }
  .status-cell,
  .permissions-cell {
    grid-column: 1;
  }
  .card-actions {
    grid-column: 1;
    grid-row: auto;
    flex-wrap: wrap;
  }
  .form-grid,
  .permission-summary {
    grid-template-columns: minmax(0, 1fr);
  }
}
@media (max-width: 480px) {
  .staff-card {
    gap: 0.7rem;
    padding: 0.85rem;
  }
  .invite-actions {
    flex-direction: column;
  }
}
</style>
