import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import { PERMISSIONS } from '../../../../apps/tadil-api/src/app/auth/permissions';

async function main() {
  const db = new PrismaClient();
  try {
    if (await db.staffAccount.count()) {
      console.log('Staff accounts already exist; bootstrap skipped.');
      return;
    }
    const email = process.env.STAFF_BOOTSTRAP_EMAIL?.trim().toLowerCase();
    const name = process.env.STAFF_BOOTSTRAP_NAME?.trim();
    const password = process.env.STAFF_BOOTSTRAP_PASSWORD;
    if (
      !email ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      email.length > 254 ||
      !name ||
      name.length > 160
    )
      throw new Error('Provide STAFF_BOOTSTRAP_EMAIL and STAFF_BOOTSTRAP_NAME');
    if (
      !password ||
      password.length < 12 ||
      password.length > 128 ||
      !/[a-z]/.test(password) ||
      !/[A-Z]/.test(password) ||
      !/[0-9]/.test(password) ||
      !/[^A-Za-z0-9]/.test(password)
    )
      throw new Error(
        'STAFF_BOOTSTRAP_PASSWORD must be 12–128 characters with upper, lower, number, and symbol'
      );
    const passwordHash = await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });
    await db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(8192741)`;
      if (await tx.staffAccount.count()) return;
      const role = await tx.staffRole.upsert({
        where: { name: 'System Administrator' },
        update: { permissions: [...PERMISSIONS], isSystem: true },
        create: {
          name: 'System Administrator',
          permissions: [...PERMISSIONS],
          isSystem: true,
        },
      });
      const account = await tx.staffAccount.create({
        data: {
          email,
          name,
          passwordHash,
          isSystemAdmin: true,
          roles: { create: { roleId: role.id } },
        },
      });
      await tx.staffAudit.create({
        data: {
          actorId: account.id,
          action: 'staff.bootstrapped',
          targetType: 'StaffAccount',
          targetId: account.id,
        },
      });
    });
    console.log('Administrator bootstrap complete.');
  } finally {
    await db.$disconnect();
  }
}

main().catch(() => {
  console.error(
    'Administrator bootstrap failed. Check required environment values, password policy, and database availability.'
  );
  process.exitCode = 1;
});
