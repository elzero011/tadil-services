import assert from 'node:assert/strict';
import { baseCompile } from '@intlify/message-compiler';
import { PERMISSIONS } from '../apps/tadil-api/src/app/auth/permissions';
import {
  accessEn,
  accessAr,
} from '../apps/tadil-admin-web-client/src/i18n/access-messages';
import {
  authEn,
  authAr,
} from '../apps/tadil-admin-web-client/src/i18n/auth-messages';
import {
  staffEn,
  staffAr,
} from '../apps/tadil-admin-web-client/src/i18n/staff-messages';
import {
  hiAccessMessages,
  bnAccessMessages,
  urAccessMessages,
} from '../apps/tadil-admin-web-client/src/i18n/additional-access-messages';
import {
  addPageAccess,
  removePermissions,
} from '../apps/tadil-admin-web-client/src/views/staff/permission-selection';

function flatten(
  value: Record<string, unknown>,
  prefix = ''
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(value).flatMap(([key, child]) => {
      const path = prefix ? `${prefix}.${key}` : key;
      return typeof child === 'string'
        ? [[path, child]]
        : Object.entries(flatten(child as Record<string, unknown>, path));
    })
  );
}

const messages = {
  en: { access: accessEn, ...authEn, staff: staffEn },
  ar: { access: accessAr, ...authAr, staff: staffAr },
  hi: hiAccessMessages,
  bn: bnAccessMessages,
  ur: urAccessMessages,
};
const reference = flatten(messages.en);
const placeholders = (value: string) =>
  [...value.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
for (const [locale, bundle] of Object.entries(messages)) {
  const translated = flatten(bundle);
  assert.deepEqual(
    Object.keys(translated).sort(),
    Object.keys(reference).sort(),
    `${locale}: translation key parity`
  );
  for (const [key, value] of Object.entries(translated)) {
    assert.ok(value.trim(), `${locale}.${key}: empty translation`);
    assert.deepEqual(
      placeholders(value),
      placeholders(reference[key]),
      `${locale}.${key}: interpolation parity`
    );
    baseCompile(value, {
      onError: (error) => {
        throw new Error(`${locale}.${key}: ${error.message}`);
      },
    });
  }
  for (const permission of PERMISSIONS) {
    const [resource, action] = permission.split('.');
    assert.ok(
      translated[`access.resources.${resource}`],
      `${locale}: ${resource} missing`
    );
    assert.ok(
      translated[`access.actions.${action}`],
      `${locale}: ${action} missing`
    );
  }
  console.log(
    `${locale}: ${Object.keys(translated).length} translations compile; all ${
      PERMISSIONS.length
    } permissions have labels.`
  );
}

assert.deepEqual(
  addPageAccess(
    ['orders.assign_tailor'],
    ['orders.read', 'orders.assign_tailor']
  ),
  ['orders.read', 'orders.assign_tailor']
);
assert.deepEqual(
  addPageAccess(['orders.assign_tailor'], ['orders.assign_tailor']),
  ['orders.assign_tailor']
);
assert.deepEqual(
  addPageAccess(['orders.read', 'orders.read'], ['orders.read']),
  ['orders.read']
);
assert.deepEqual(
  removePermissions(
    ['orders.read', 'orders.assign_tailor', 'extras.read'],
    ['orders.read'],
    true
  ),
  ['extras.read']
);
assert.deepEqual(
  removePermissions(
    ['orders.read', 'orders.assign_tailor'],
    ['orders.assign_tailor'],
    true
  ),
  ['orders.read']
);
assert.deepEqual(
  removePermissions(['orders.read', 'orders.assign_tailor'], ['orders.read']),
  ['orders.assign_tailor']
);
console.log(
  '6 permission-selection regression checks passed (including independent direct denials).'
);
