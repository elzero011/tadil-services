# Staff authentication and Keycloak cutover

The admin application authenticates staff against PostgreSQL, without Keycloak,
Redis, or an external identity service. Customer, tailor, and courier accounts
and their existing mobile login flow are separate and unchanged.

## Security model

- Staff credentials use Argon2id. Passwords are 12–128 characters with upper/lower
  case, a number, and a symbol. There is no public staff registration.
- Random eight-hour session credentials live in HttpOnly, SameSite=Lax cookies.
  Only SHA-256 hashes are stored in the database. HTTPS cookies are mandatory
  in production. Password changes/resets and disabling accounts revoke sessions.
- Every mutation checks the exact Origin allowlist and an `X-CSRF-Token` header.
  `/api/auth/me` returns the current synchronizer token and effective permissions.
  Login and invitation redemption require an allowed Origin but no existing session.
- Login attempts have database-backed per-account and per-IP limits over a
  15-minute window. Configure any external ingress rate limiter too. The API
  does not trust arbitrary forwarded client-IP headers.
- Effective permissions are role grants plus direct grants, minus direct denials.
  Guards reload account/role state on each request. Unknown or unclassified API
  endpoints are denied. Frontend filtering is not the security boundary.
- Protected system administrators receive every code-defined permission. Their
  role cannot be edited/deleted, and they cannot have direct denials. Disabling
  or demoting the last active system administrator is rejected. Administrative
  writes are serialized in a transaction and recheck the acting account.
- Managers cannot grant capabilities they do not possess, edit higher-privilege
  accounts, or reset a system administrator's password. Sensitive writes are
  recorded in `StaffAudit`; passwords and tokens are never recorded there.

See [the permission matrix](staff-permissions.md). Mutations normally require both
the resource's read permission and action permission. Additional read capabilities
needed by a form are explained there. Staff management is distinct from business
customer/tailor/courier management.

## Deployment configuration

Prefer **same-origin `/api` proxying** so session cookies remain first-party:

1. Leave the web build's `VITE_TADIL_API_URL` empty.
2. Set the web container's runtime `TADIL_API_UPSTREAM` to the admin API origin,
   without a trailing slash or `/api` suffix, e.g. `http://tadil-api:4444`.
   The Nginx template proxies `/api/*`, including cookies, to this upstream.
3. Set `STAFF_ALLOWED_ORIGINS` on the API to the exact public dashboard origin,
   e.g. `https://admin.example.com`. Multiple origins are comma-separated;
   wildcards are not supported. Keep `NODE_ENV=production` behind HTTPS.
4. Keep `TADIL_DB` and existing MinIO settings. Remove `KEYCLOAK_*` and
   `VITE_KEYCLOAK_*`. Do not reuse the mobile JWT secret for staff sessions.

For local development use `http://localhost:4000` in `STAFF_ALLOWED_ORIGINS`,
`STAFF_SESSION_SECURE=false`, and `TADIL_API_PROXY_TARGET=http://localhost:4444`.
Do not put bootstrap passwords or invitation files in source control.

## Bootstrap and migration runbook

This branch is a **coordinated cutover**, not a dual-token/dual-provider mode.
Do not remove the deployed Keycloak services before staff can log in locally.

1. Back up the application database and Keycloak database/realm configuration.
   Inventory active staff, verified email addresses, role assignments, federation,
   MFA, SSO, and password-recovery behavior from the deployed realm. This repository
   does not contain that production inventory. If MFA/SSO is required, do not cut
   over until an equivalent has been implemented and accepted.
2. Apply additive migrations with `npm run db-migrate-deploy`; generate the client
   with `npm run db-generate` as part of building the release. Existing business
   tables and mobile identities are not rewritten.
3. Securely supply `STAFF_BOOTSTRAP_EMAIL`, `STAFF_BOOTSTRAP_NAME`, and
   `STAFF_BOOTSTRAP_PASSWORD`, then run `npm run staff:bootstrap` in an operator
   environment with production database access. It only runs when no staff
   accounts exist, takes a database lock, and never prints the password. Remove
   these bootstrap environment variables afterwards.
4. In a staging deployment using the new API and dashboard, create the required
   roles and staff accounts. Map existing `super_admin` accounts to the protected
   System Administrator role; map other users explicitly using the permission
   matrix. Have a second activated system administrator before cutover.
5. Use **Invite staff** and deliver the one-time activation link through a trusted
   channel after verifying the recipient. Invitation links expire after 48 hours;
   reset links expire after one hour. Reissuing a link invalidates previous links.
   Passwords are not copied from Keycloak. Existing Keycloak sessions cannot log
   into the replacement and everyone must sign in again.
6. Verify representative workflows and denied access in staging. Roll out API and
   web together during an agreed cutover window. Avoid mixed old/new frontend and
   API versions; old bearer tokens intentionally receive `401`.
7. After acceptance, stop/remove **only** the Keycloak and Keycloak database
   services in the hosting provider (or the old Compose services). Retain their
   backup/volume for the agreed rollback window. Never run `docker compose down -v`
   against the application stack: that also deletes business data and media.

Account creation and mapping are currently performed through the application UI;
there is no automatic import of a production Keycloak realm. No deployed users
or production services are modified by applying this source branch alone.

### Invitations and password recovery

There is no configured email delivery provider in this repository. The UI creates
one-time links for **manual secure delivery**, not automatic email. Staff who
forget a password contact an authorized staff manager, who issues a reset link.
Links keep the secret in the URL fragment, remove it after opening, and redeem it
only once. Disabling an account invalidates outstanding links. A manager must
deliberately enable/reinvite a disabled account; stale tokens cannot reactivate it.

The bootstrap command is not a recovery backdoor once staff accounts exist. Keep
two activated system administrators and an operator-controlled database recovery
procedure. Never reset administrator credentials through a public endpoint.

### Rollback

Keep the pre-cutover application images/configuration and the Keycloak backup.
If acceptance fails, route both API and web back to that compatible release and
restore the old identity-service configuration. The new tables are additive and
can remain. Staff/role changes made after cutover are **not** synchronized back to
Keycloak: reconcile them, especially revocations, before enabling the old system.
Do not restore the entire application database merely to revert authentication.

## Verification and operations

```
npm run db-generate
npm run typecheck:admin-api
npm run test:staff
npm run build-admin-api
npm run build -w tadil-web-client
```

The HTTP suite `npm run test:staff:integration` requires a running local API,
bootstrap credentials, and an isolated local database named `*_preview` or
`*_auth_test`. It refuses remote/production databases and removes its test accounts.
It verifies role grants, explicit denials, direct API rejection, session revocation,
CSRF, invitation/reset reuse, and administrator protection.

For the Hoplite native preview, `bash scripts/preview-setup.sh` prepares an isolated
database, private random bootstrap credentials, and the official MinIO executable;
`bash scripts/preview-run.sh` runs the API and dashboard together. The native setup
expects Ubuntu PostgreSQL 16 tooling and Docker image-download support, avoiding
sandbox volume mounts. It never seeds or resets a configured production database.

Schedule retention maintenance appropriate to deployment volume: delete expired or
revoked `StaffSession` records, used/expired `StaffToken` records, and old
`StaffLoginThrottle` rows after their window expires. Retain `StaffAudit` according
to the security policy. No new always-on worker service is required.

## Explicit compatibility boundaries

- The existing generic public media route is preserved for mobile compatibility.
  This change does **not** claim order/chat media privacy; owner-aware media URLs
  require a separate coordinated mobile change. Do not put staff secrets there.
- Mobile authentication and mobile endpoint policies are not replaced by staff
  roles. Mobile bearer credentials are rejected by the staff API.
- Application-native MFA, SSO/federation, email automation, and production identity
  import are not implemented. Verify that none is required for your cutover.
