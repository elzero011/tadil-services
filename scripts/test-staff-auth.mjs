import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { PrismaClient } from '@prisma/client';

const base = process.env.STAFF_TEST_URL || 'http://localhost:4444';
const origin = process.env.STAFF_TEST_ORIGIN || 'http://localhost:5173';
const database = new URL(
  process.env.TADIL_DB || 'postgresql://localhost/missing'
);
if (
  !['localhost', '127.0.0.1'].includes(new URL(base).hostname) ||
  !['localhost', '127.0.0.1'].includes(database.hostname) ||
  !/_(preview|auth_test)$/.test(database.pathname)
)
  throw new Error(
    'These writable integration tests require an isolated local *_preview or *_auth_test database'
  );
assert(
  process.env.STAFF_BOOTSTRAP_EMAIL && process.env.STAFF_BOOTSTRAP_PASSWORD,
  'Bootstrap credentials are required'
);
const db = new PrismaClient();
const tag = `auth-test-${randomBytes(6).toString('hex')}`;
const password = `Aa1!${randomBytes(18).toString('hex')}`;
const ids = [],
  roleIds = [];
let checks = 0;

async function request(
  path,
  { method = 'GET', body, session, csrf = true, requestOrigin = origin } = {}
) {
  const headers = { Origin: requestOrigin };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (session) {
    headers.Cookie = session.cookie;
    if (csrf) headers['X-CSRF-Token'] = session.csrfToken;
  }
  const response = await fetch(`${base}/api${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: response.status, data, headers: response.headers };
}
function status(result, expected, label) {
  assert.equal(result.status, expected, `${label}: unexpected HTTP status`);
  checks++;
}
async function login(email, pass = password) {
  const response = await request('/auth/login', {
    method: 'POST',
    body: { email, password: pass },
  });
  status(response, 201, 'login');
  const cookie = response.headers
    .getSetCookie()
    .find((value) => value.startsWith('staff_session='));
  assert(
    cookie?.includes('HttpOnly') && cookie.includes('SameSite=Lax'),
    'Session cookie protections'
  );
  return {
    cookie: cookie.split(';')[0],
    csrfToken: response.data.csrfToken,
    user: response.data,
  };
}
async function createUser(admin, suffix, properties = {}) {
  const email = `${tag}-${suffix}@example.test`;
  const result = await request('/staff/users', {
    method: 'POST',
    session: admin,
    body: {
      email,
      name: `Test ${suffix}`,
      roleIds: [],
      grants: [],
      denials: [],
      ...properties,
    },
  });
  status(result, 201, 'create staff account');
  ids.push(result.data.account.id);
  return { ...result.data, email };
}
async function accept(invitationToken) {
  return request('/auth/accept-invitation', {
    method: 'POST',
    body: { token: invitationToken, password },
  });
}

try {
  status(await request('/orders'), 401, 'unauthenticated endpoint');
  status(
    await request('/auth/login', {
      method: 'POST',
      body: { email: process.env.STAFF_BOOTSTRAP_EMAIL, password: 'incorrect' },
    }),
    401,
    'incorrect password'
  );
  const admin = await login(
    process.env.STAFF_BOOTSTRAP_EMAIL,
    process.env.STAFF_BOOTSTRAP_PASSWORD
  );
  const me = await request('/auth/me', { session: admin });
  status(me, 200, 'current user');
  assert.equal(me.data.csrfToken, admin.csrfToken, 'CSRF survives page reload');
  status(
    await request('/auth/logout', {
      method: 'POST',
      session: admin,
      csrf: false,
    }),
    403,
    'missing CSRF'
  );
  status(
    await request('/auth/logout', {
      method: 'POST',
      session: admin,
      requestOrigin: 'https://untrusted.example',
    }),
    403,
    'foreign origin'
  );
  status(
    await request('/staff/roles', {
      method: 'POST',
      session: admin,
      body: { name: tag, permissions: ['not.a.permission'] },
    }),
    400,
    'unknown permission'
  );

  const roleResult = await request('/staff/roles', {
    method: 'POST',
    session: admin,
    body: { name: tag, permissions: ['orders.read', 'customers.read'] },
  });
  status(roleResult, 201, 'create role');
  roleIds.push(roleResult.data.id);
  const reader = await createUser(admin, 'reader', {
    roleIds: roleIds,
    denials: ['customers.read'],
  });
  status(await accept(reader.invitationToken), 201, 'activate invitation');
  status(await accept(reader.invitationToken), 400, 'single-use invitation');
  const readerSession = await login(reader.email);
  status(
    await request('/orders', { session: readerSession }),
    200,
    'read orders'
  );
  status(
    await request('/customers', { session: readerSession }),
    403,
    'explicit denial overrides role'
  );
  status(
    await request('/orders/nonexistent/assign-tailor', {
      method: 'POST',
      session: readerSession,
      body: { tailorId: 'nonexistent' },
    }),
    403,
    'direct mutation denied'
  );
  status(
    await request('/staff/users', { session: readerSession }),
    403,
    'staff management denied'
  );
  const noAuthToken = await fetch(`${base}/api/orders`, {
    headers: { Authorization: 'Bearer not-a-staff-session' },
  });
  assert.equal(
    noAuthToken.status,
    401,
    'Mobile bearer cannot authenticate staff endpoint'
  );
  checks++;

  status(
    await request(`/staff/roles/${roleIds[0]}`, {
      method: 'PATCH',
      session: admin,
      body: { permissions: [] },
    }),
    200,
    'role revocation'
  );
  status(
    await request('/orders', { session: readerSession }),
    403,
    'revocation applies to existing session'
  );
  status(
    await request(`/staff/users/${reader.account.id}`, {
      method: 'PATCH',
      session: admin,
      body: { grants: ['orders.read'] },
    }),
    200,
    'direct grant'
  );
  status(
    await request('/orders', { session: readerSession }),
    200,
    'direct grant applies immediately'
  );

  const reset = await request(
    `/staff/users/${reader.account.id}/reset-password`,
    { method: 'POST', session: admin }
  );
  status(reset, 201, 'issue reset');
  status(await accept(reset.data.invitationToken), 201, 'redeem reset');
  status(
    await request('/auth/me', { session: readerSession }),
    401,
    'reset revokes sessions'
  );
  const renewed = await login(reader.email);
  const staleReset = await request(
    `/staff/users/${reader.account.id}/reset-password`,
    { method: 'POST', session: admin }
  );
  status(
    await request(`/staff/users/${reader.account.id}`, {
      method: 'PATCH',
      session: admin,
      body: { active: false },
    }),
    200,
    'disable account'
  );
  status(
    await request('/auth/me', { session: renewed }),
    401,
    'disabled account session revoked'
  );
  status(
    await accept(staleReset.data.invitationToken),
    400,
    'disabled account cannot reactivate with stale token'
  );

  const manuallyEnabled = await createUser(admin, 'manually-enabled');
  status(
    await request(`/staff/users/${manuallyEnabled.account.id}`, {
      method: 'PATCH',
      session: admin,
      body: { active: true },
    }),
    200,
    'administrator activates account'
  );
  status(
    await accept(manuallyEnabled.invitationToken),
    400,
    'activation invalidates pending invitation'
  );

  const manager = await createUser(admin, 'manager', {
    grants: [
      'staff.read',
      'staff.create',
      'staff.update',
      'roles.read',
      'roles.create',
      'roles.update',
      'roles.delete',
      'alterations.read',
      'alterations.update',
    ],
  });
  status(await accept(manager.invitationToken), 201, 'activate manager');
  const managerSession = await login(manager.email);
  status(
    await request('/staff/roles', {
      method: 'POST',
      session: managerSession,
      body: { name: `${tag}-escalation`, permissions: ['payouts.fulfill'] },
    }),
    403,
    'delegation bounded by actor permissions'
  );
  status(
    await request(`/staff/users/${admin.user.id}/reset-password`, {
      method: 'POST',
      session: managerSession,
    }),
    403,
    'manager cannot take over full administrator'
  );
  status(
    await request('/catalog/extras/nonexistent/sorting', {
      method: 'PATCH',
      session: managerSession,
      body: { sorting: 1 },
    }),
    403,
    'sorting checks exact resource'
  );
  status(
    await request(`/staff/users/${manager.account.id}`, {
      method: 'PATCH',
      session: managerSession,
      body: { grants: ['payouts.fulfill'] },
    }),
    403,
    'self escalation blocked'
  );

  if (
    (await db.staffAccount.count({
      where: { isSystemAdmin: true, active: true },
    })) === 1
  ) {
    status(
      await request(`/staff/users/${admin.user.id}`, {
        method: 'PATCH',
        session: admin,
        body: { active: false },
      }),
      409,
      'last admin cannot be disabled'
    );
    status(
      await request(`/staff/users/${admin.user.id}`, {
        method: 'PATCH',
        session: admin,
        body: { roleIds: [] },
      }),
      409,
      'last admin cannot be demoted'
    );
  }
  status(
    await request('/auth/password', {
      method: 'POST',
      session: managerSession,
      body: { currentPassword: password, newPassword: 'weak' },
    }),
    400,
    'weak password rejected'
  );
  status(
    await request('/auth/password', {
      method: 'POST',
      session: managerSession,
      body: { currentPassword: password, newPassword: `${password}B!` },
    }),
    201,
    'change password'
  );
  status(
    await request('/auth/me', { session: managerSession }),
    401,
    'password change revokes session'
  );
  assert(
    (await db.staffAudit.count({ where: { targetId: { in: ids } } })) > 0,
    'Security changes audited'
  );
  checks++;
  status(
    await request('/auth/logout', { method: 'POST', session: admin }),
    201,
    'logout'
  );
  status(
    await request('/auth/me', { session: admin }),
    401,
    'logout revokes session'
  );
  console.log(
    `Staff authentication integration tests passed (${checks} checks).`
  );
} finally {
  await db.staffAudit.deleteMany({
    where: {
      OR: [
        { actorId: { in: ids } },
        { targetId: { in: [...ids, ...roleIds] } },
      ],
    },
  });
  await db.staffAccount.deleteMany({ where: { id: { in: ids } } });
  await db.staffRole.deleteMany({ where: { id: { in: roleIds } } });
  await db.$disconnect();
}
