export const PERMISSIONS = [
  ...[
    'informations',
    'alterations',
    'extras',
    'models',
    'tailors',
    'couriers',
  ].flatMap((resource) =>
    ['read', 'create', 'update', 'delete'].map(
      (action) => `${resource}.${action}`
    )
  ),
  'customers.read',
  'orders.read',
  'orders.assign_tailor',
  'login_requests.read',
  'login_requests.approve',
  'login_requests.reject',
  'payouts.read',
  'payouts.fulfill',
  'payouts.reject',
  'locations.read',
  'staff.read',
  'staff.create',
  'staff.update',
  'roles.read',
  'roles.create',
  'roles.update',
  'roles.delete',
] as const;
export type Permission = (typeof PERMISSIONS)[number];
export const PERMISSION_SET = new Set<string>(PERMISSIONS);
export function validatePermissions(values: string[] = []): string[] {
  return [...new Set(values)].filter((value) => PERMISSION_SET.has(value));
}
