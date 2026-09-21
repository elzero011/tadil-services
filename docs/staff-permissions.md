# Staff permission matrix

The admin API is deny-by-default. Every route is either explicitly classified
with `@RequirePermissions`, `@AuthenticatedRoute` (for an exact request-time
check), or `@Public`.

| Resource | Read | Create | Update | Delete | Special |
| --- | --- | --- | --- | --- | --- |
| informations, alterations, extras, models | `.read` | `.read + .create` | `.read + .update` | `.read + .delete` | Catalog sorting checks the matching `.read + .update` pair. |
| tailors, couriers | `.read` | `.read + .create` | `.read + .update` | `.read + .delete` | User IDs are checked against the endpoint role. |
| customers | `.read` | — | — | — | Customer sorting is rejected. |
| orders | `.read` | — | — | — | Assignment requires `.read + orders.assign_tailor`. |
| login requests | `.read` | — | — | — | Approve/reject require `.read` plus the action. |
| payouts | `.read` | — | — | — | Fulfill/reject require `.read` plus the action. |
| locations | `.read` | — | — | — | |
| staff | `.read` | `.read + .create` | `.read + .update` | — | Invite, reset, activate, deactivate and change assignments. |
| roles | `.read` | `.read + .create` | `.read + .update` | `.read + .delete` | System role is immutable. |

The dashboard loads related lookup data only when allowed: order assignment needs
`tailors.read` as well as its action permission; order filters need the matching
customer/courier/tailor read permission. Model editors use alteration/information
lookups, and tailor/courier address forms use `locations.read`. Include the relevant
read capabilities when assembling usable editor roles. Wallet views independently
require `payouts.read`. No read-only role implicitly receives mutation permissions.

Media scope: the existing generic `/api/files/:id` route remains public for
backward compatibility with mobile catalog and historical clients. It is not
claimed to enforce order/chat media privacy. Owner-aware mobile links and a
separate authenticated order-file endpoint are deferred to a dedicated media
hardening change, rather than partially changing this route and breaking
existing clients.
