import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import * as argon2 from 'argon2';
import { DbClient } from '@tadil-database';
import { PERMISSION_SET, validatePermissions } from './permissions';

const includeRoles = { roles: { include: { role: true } } } as const;
type Account = Prisma.StaffAccountGetPayload<{ include: typeof includeRoles }>;
type Actor = { id: string; permissions: string[]; isSystemAdmin: boolean };
type Transaction = Prisma.TransactionClient;
const digest = (value: string) =>
  createHash('sha256').update(value).digest('hex');
const csrfFor = (token: string) => digest(`staff-csrf:${token}`);
const passwordOptions = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};
let dummyPassword: Promise<string> | undefined;

function text(value: unknown, label: string, max = 160): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max)
    throw new BadRequestException(`Invalid ${label}`);
  return value.trim();
}
function emailOf(value: unknown): string {
  const email = text(value, 'email', 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new BadRequestException('Invalid email');
  return email;
}
function passwordOf(value: unknown): string {
  if (
    typeof value !== 'string' ||
    value.length < 12 ||
    value.length > 128 ||
    !/[a-z]/.test(value) ||
    !/[A-Z]/.test(value) ||
    !/[0-9]/.test(value) ||
    !/[^A-Za-z0-9]/.test(value)
  )
    throw new BadRequestException(
      'Password must be 12–128 characters and include upper, lower, number, and symbol'
    );
  return value;
}
function strings(value: unknown, label: string): string[] {
  if (
    !Array.isArray(value) ||
    value.length > 100 ||
    value.some((item) => typeof item !== 'string' || item.length > 160)
  )
    throw new BadRequestException(`Invalid ${label}`);
  return [...new Set(value as string[])];
}
function permissionsOf(value: unknown): string[] {
  const permissions = strings(value, 'permissions');
  if (permissions.some((key) => !PERMISSION_SET.has(key)))
    throw new BadRequestException('Unknown permission');
  return permissions;
}
function bodyOf(value: unknown, allowed: string[]): Record<string, unknown> {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.keys(value).some((key) => !allowed.includes(key))
  )
    throw new BadRequestException('Invalid request fields');
  return value as Record<string, unknown>;
}

@Injectable()
export class AuthService {
  constructor(private readonly db: DbClient) {}

  async login(email: unknown, password: unknown, ip = 'unknown') {
    const emailKey = emailOf(email);
    if (typeof password !== 'string' || password.length > 128)
      throw new UnauthorizedException('Invalid credentials');
    await this.throttle(`ip:${digest(ip)}`, 60);
    await this.throttle(`account:${digest(emailKey)}`, 10);
    const account = await this.db.staffAccount.findUnique({
      where: { email: emailKey },
      include: includeRoles,
    });
    dummyPassword ??= argon2.hash(randomBytes(32), passwordOptions);
    const valid = await argon2.verify(
      account?.passwordHash ?? (await dummyPassword),
      password
    );
    if (!account || !account.active || !valid)
      throw new UnauthorizedException('Invalid credentials');
    // Recheck under the same lock as password resets and account disabling.
    return this.db.$transaction(async (tx) => {
      await this.lock(tx);
      const current = await tx.staffAccount.findUnique({
        where: { id: account.id },
        include: includeRoles,
      });
      if (!current?.active || current.passwordHash !== account.passwordHash)
        throw new UnauthorizedException('Invalid credentials');
      const result = await this.createSession(current, tx);
      await this.audit(
        tx,
        account.id,
        'session.created',
        'StaffAccount',
        account.id
      );
      return result;
    });
  }

  private async throttle(key: string, limit: number) {
    const now = new Date();
    await this.db.staffLoginThrottle.updateMany({
      where: { email: key, lockedUntil: { lte: now } },
      data: { failures: 0, lockedUntil: new Date(Date.now() + 15 * 60_000) },
    });
    const attempt = await this.db.staffLoginThrottle.upsert({
      where: { email: key },
      create: {
        email: key,
        failures: 1,
        lockedUntil: new Date(Date.now() + 15 * 60_000),
      },
      update: { failures: { increment: 1 } },
    });
    if (attempt.failures > limit)
      throw new UnauthorizedException(
        'Too many login attempts. Try again later.'
      );
  }

  async createSession(account: Account, tx: Transaction = this.db) {
    const token = randomBytes(32).toString('base64url');
    const csrfToken = csrfFor(token);
    await tx.staffSession.create({
      data: {
        tokenHash: digest(token),
        csrfHash: digest(csrfToken),
        accountId: account.id,
        expiresAt: new Date(Date.now() + 8 * 60 * 60_000),
      },
    });
    return { token, user: this.userView(account, csrfToken) };
  }

  async loadSession(
    token: string | undefined,
    csrf: string | undefined,
    method: string
  ) {
    if (typeof token !== 'string' || !/^[\w-]{43}$/.test(token)) return null;
    const session = await this.db.staffSession.findUnique({
      where: { tokenHash: digest(token) },
      include: { account: { include: includeRoles } },
    });
    if (
      !session ||
      session.revokedAt ||
      session.expiresAt <= new Date() ||
      !session.account.active
    )
      return null;
    const csrfToken = csrfFor(token);
    if (
      !['GET', 'HEAD', 'OPTIONS'].includes(method) &&
      (typeof csrf !== 'string' ||
        !timingSafeEqual(
          Buffer.from(digest(csrf)),
          Buffer.from(digest(csrfToken))
        ))
    )
      throw new ForbiddenException('Invalid CSRF token');
    return { user: this.userView(session.account, csrfToken) };
  }

  userView(account: Account, csrfToken: string) {
    const roles = account.roles.map(({ role }) => ({
      id: role.id,
      name: role.name,
      permissions: validatePermissions(role.permissions),
    }));
    return {
      id: account.id,
      email: account.email,
      name: account.name,
      permissions: this.effective(account, roles),
      roles,
      csrfToken,
      isSystemAdmin: account.isSystemAdmin,
    };
  }

  effective(
    account: { grants: string[]; denials: string[]; roles?: Account['roles'] },
    roles: { permissions: string[] }[] = account.roles?.map(
      (link) => link.role
    ) ?? []
  ) {
    const granted = new Set(
      [...roles.flatMap((role) => role.permissions), ...account.grants].filter(
        (key) => PERMISSION_SET.has(key)
      )
    );
    return [...granted].filter((key) => !account.denials.includes(key));
  }

  hasPermissions(user: { permissions: string[] }, required: string[]) {
    return required.every((key) => user.permissions.includes(key));
  }

  async logout(token?: string) {
    if (token)
      await this.db.staffSession.updateMany({
        where: { tokenHash: digest(token) },
        data: { revokedAt: new Date() },
      });
  }

  async changePassword(
    userId: string,
    currentPassword: unknown,
    newPassword: unknown
  ) {
    const passwordHash = await argon2.hash(
      passwordOf(newPassword),
      passwordOptions
    );
    if (typeof currentPassword !== 'string' || currentPassword.length > 128)
      throw new UnauthorizedException('Invalid password');
    const account = await this.db.staffAccount.findUnique({
      where: { id: userId },
    });
    if (
      !account ||
      !(await argon2.verify(account.passwordHash, currentPassword))
    )
      throw new UnauthorizedException('Invalid password');
    await this.db.$transaction(async (tx) => {
      await this.lock(tx);
      const updated = await tx.staffAccount.updateMany({
        where: { id: userId, active: true, passwordHash: account.passwordHash },
        data: { passwordHash },
      });
      if (!updated.count) throw new UnauthorizedException('Invalid password');
      await this.revoke(tx, userId);
      await this.audit(tx, userId, 'password.changed', 'StaffAccount', userId);
    });
  }

  private assertDelegation(actor: Actor, permissions: string[]) {
    if (
      permissions.some(
        (key) => !PERMISSION_SET.has(key) || !actor.permissions.includes(key)
      )
    )
      throw new ForbiddenException(
        'Cannot delegate permissions you do not possess'
      );
  }

  private accountView(account: Account) {
    return {
      id: account.id,
      email: account.email,
      name: account.name,
      active: account.active,
      isSystemAdmin: account.isSystemAdmin,
      roleIds: account.roles.map((link) => link.roleId),
      grants: account.grants,
      denials: account.denials,
      effectivePermissions: this.effective(account),
    };
  }

  async accounts() {
    const rows = await this.db.staffAccount.findMany({
      include: includeRoles,
      orderBy: { email: 'asc' },
    });
    return rows.map((row) => this.accountView(row));
  }

  private async assignedRoles(tx: Transaction, ids: unknown) {
    const roleIds = strings(ids, 'roles');
    const roles = await tx.staffRole.findMany({
      where: { id: { in: roleIds } },
    });
    if (roles.length !== roleIds.length)
      throw new BadRequestException('Unknown role');
    return roles;
  }

  async createAccount(actor: Actor, input: unknown) {
    const body = bodyOf(input, [
      'email',
      'name',
      'roleIds',
      'grants',
      'denials',
    ]);
    const email = emailOf(body.email),
      name = text(body.name, 'name');
    const grants = permissionsOf(body.grants ?? []),
      denials = permissionsOf(body.denials ?? []);
    const passwordHash = await argon2.hash(randomBytes(32), passwordOptions);
    return this.write(
      actor,
      ['staff.read', 'staff.create'],
      async (tx, current) => {
        const roles = await this.assignedRoles(tx, body.roleIds ?? []);
        this.assertDelegation(current, [
          ...roles.flatMap((role) => role.permissions),
          ...grants,
        ]);
        const isSystemAdmin = roles.some((role) => role.isSystem);
        if (isSystemAdmin && (!current.isSystemAdmin || denials.length))
          throw new ForbiddenException('Protected administrator role');
        const account = await tx.staffAccount.create({
          data: {
            email,
            name,
            passwordHash,
            active: false,
            isSystemAdmin,
            grants,
            denials,
            roles: { create: roles.map((role) => ({ roleId: role.id })) },
          },
          include: includeRoles,
        });
        const invitationToken = await this.issueToken(
          tx,
          account.id,
          'invitation'
        );
        await this.audit(
          tx,
          actor.id,
          'staff.created',
          'StaffAccount',
          account.id
        );
        return { account: this.accountView(account), invitationToken };
      }
    );
  }

  async updateAccount(actor: Actor, id: string, input: unknown) {
    const body = bodyOf(input, [
      'name',
      'active',
      'roleIds',
      'grants',
      'denials',
    ]);
    if (body.active !== undefined && typeof body.active !== 'boolean')
      throw new BadRequestException('Invalid active status');
    return this.write(
      actor,
      ['staff.read', 'staff.update'],
      async (tx, current) => {
        const target = await tx.staffAccount.findUnique({
          where: { id },
          include: includeRoles,
        });
        if (!target) throw new BadRequestException('Account not found');
        this.assertManageable(current, target);
        const roles =
          body.roleIds === undefined
            ? target.roles.map((link) => link.role)
            : await this.assignedRoles(tx, body.roleIds);
        const grants =
          body.grants === undefined
            ? target.grants
            : permissionsOf(body.grants);
        const denials =
          body.denials === undefined
            ? target.denials
            : permissionsOf(body.denials);
        this.assertDelegation(current, [
          ...roles.flatMap((role) => role.permissions),
          ...grants,
        ]);
        const isSystemAdmin = roles.some((role) => role.isSystem);
        if (isSystemAdmin && (!current.isSystemAdmin || denials.length))
          throw new ForbiddenException('Protected administrator role');
        const active =
          body.active === undefined ? target.active : (body.active as boolean);
        if (
          target.isSystemAdmin &&
          target.active &&
          (!active || !isSystemAdmin)
        )
          await this.assertAdminRemains(tx, id);
        const account = await tx.staffAccount.update({
          where: { id },
          data: {
            name:
              body.name === undefined ? target.name : text(body.name, 'name'),
            active,
            grants,
            denials,
            isSystemAdmin,
            roles: {
              deleteMany: {},
              create: roles.map((role) => ({ roleId: role.id })),
            },
          },
          include: includeRoles,
        });
        if (!active || target.active !== active) await this.revoke(tx, id);
        await this.audit(tx, actor.id, 'staff.updated', 'StaffAccount', id);
        return this.accountView(account);
      }
    );
  }

  private assertManageable(actor: Actor, target: Account) {
    if (target.isSystemAdmin && !actor.isSystemAdmin)
      throw new ForbiddenException(
        'Only a full administrator may manage an administrator'
      );
    this.assertDelegation(actor, this.effective(target));
  }

  private async assertAdminRemains(tx: Transaction, removingId: string) {
    if (
      !(await tx.staffAccount.count({
        where: { isSystemAdmin: true, active: true, id: { not: removingId } },
      }))
    )
      throw new ConflictException(
        'At least one active administrator is required'
      );
  }

  async issueInvitation(
    actor: Actor,
    id: string,
    type: 'invitation' | 'reset-password'
  ) {
    return this.write(
      actor,
      ['staff.read', 'staff.update'],
      async (tx, current) => {
        const account = await tx.staffAccount.findUnique({
          where: { id },
          include: includeRoles,
        });
        if (!account) throw new BadRequestException('Account not found');
        this.assertManageable(current, account);
        if (type === 'reset-password' && !account.active)
          throw new BadRequestException(
            'Enable the account before issuing a password reset'
          );
        if (type === 'invitation' && account.active)
          throw new BadRequestException(
            'Use password reset for active accounts'
          );
        const invitationToken = await this.issueToken(tx, id, type);
        await this.audit(tx, actor.id, `staff.${type}`, 'StaffAccount', id);
        return { account: this.accountView(account), invitationToken };
      }
    );
  }

  private async issueToken(tx: Transaction, accountId: string, type: string) {
    await tx.staffToken.updateMany({
      where: { accountId, usedAt: null },
      data: { usedAt: new Date() },
    });
    const raw = randomBytes(32).toString('base64url');
    await tx.staffToken.create({
      data: {
        tokenHash: digest(raw),
        type,
        accountId,
        expiresAt: new Date(
          Date.now() + (type === 'invitation' ? 48 : 1) * 60 * 60_000
        ),
      },
    });
    return raw;
  }

  async acceptToken(token: unknown, password: unknown) {
    if (typeof token !== 'string' || !/^[\w-]{43}$/.test(token))
      throw new BadRequestException('Invalid token');
    const initial = await this.db.staffToken.findUnique({
      where: { tokenHash: digest(token) },
    });
    if (!initial || initial.usedAt || initial.expiresAt <= new Date())
      throw new BadRequestException('Invalid token');
    const passwordHash = await argon2.hash(
      passwordOf(password),
      passwordOptions
    );
    await this.db.$transaction(async (tx) => {
      await this.lock(tx);
      const row = await tx.staffToken.findUnique({
        where: { id: initial.id },
        include: { account: true },
      });
      if (
        !row ||
        row.usedAt ||
        row.expiresAt <= new Date() ||
        !['invitation', 'reset-password'].includes(row.type) ||
        (row.type === 'reset-password' && !row.account.active) ||
        (row.type === 'invitation' && row.account.active)
      )
        throw new BadRequestException('Invalid token');
      await tx.staffAccount.update({
        where: { id: row.accountId },
        data: { passwordHash, active: true },
      });
      await this.revoke(tx, row.accountId);
      await this.audit(
        tx,
        row.accountId,
        'password.set',
        'StaffAccount',
        row.accountId
      );
    });
  }

  async roles() {
    return this.db.staffRole.findMany({ orderBy: { name: 'asc' } });
  }

  async createRole(actor: Actor, input: unknown) {
    const body = bodyOf(input, ['name', 'permissions']);
    const name = text(body.name, 'role name'),
      permissions = permissionsOf(body.permissions ?? []);
    return this.write(
      actor,
      ['roles.read', 'roles.create'],
      async (tx, current) => {
        this.assertDelegation(current, permissions);
        const role = await tx.staffRole.create({ data: { name, permissions } });
        await this.audit(tx, actor.id, 'role.created', 'StaffRole', role.id);
        return role;
      }
    );
  }

  async updateRole(actor: Actor, id: string, input: unknown) {
    const body = bodyOf(input, ['name', 'permissions']);
    return this.write(
      actor,
      ['roles.read', 'roles.update'],
      async (tx, current) => {
        const role = await tx.staffRole.findUnique({ where: { id } });
        if (!role || role.isSystem)
          throw new BadRequestException('Protected or unknown role');
        this.assertDelegation(current, role.permissions);
        const permissions =
          body.permissions === undefined
            ? role.permissions
            : permissionsOf(body.permissions);
        this.assertDelegation(current, permissions);
        const updated = await tx.staffRole.update({
          where: { id },
          data: {
            name:
              body.name === undefined
                ? role.name
                : text(body.name, 'role name'),
            permissions,
          },
        });
        await this.audit(tx, actor.id, 'role.updated', 'StaffRole', id);
        return updated;
      }
    );
  }

  async deleteRole(actor: Actor, id: string) {
    return this.write(
      actor,
      ['roles.read', 'roles.delete'],
      async (tx, current) => {
        const role = await tx.staffRole.findUnique({ where: { id } });
        if (!role || role.isSystem)
          throw new BadRequestException('Protected or unknown role');
        this.assertDelegation(current, role.permissions);
        await tx.staffRole.delete({ where: { id } });
        await this.audit(tx, actor.id, 'role.deleted', 'StaffRole', id);
        return { ok: true };
      }
    );
  }

  private async revoke(tx: Transaction, accountId: string) {
    await tx.staffSession.updateMany({
      where: { accountId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await tx.staffToken.updateMany({
      where: { accountId, usedAt: null },
      data: { usedAt: new Date() },
    });
  }

  private async lock(tx: Transaction) {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(8192741)`;
  }

  private async write<T>(
    actor: Actor,
    required: string[],
    action: (tx: Transaction, current: Actor) => Promise<T>
  ): Promise<T> {
    try {
      return await this.db.$transaction(async (tx) => {
        await this.lock(tx);
        const account = await tx.staffAccount.findUnique({
          where: { id: actor.id },
          include: includeRoles,
        });
        if (!account?.active) throw new UnauthorizedException();
        const current = this.userView(account, '');
        if (!this.hasPermissions(current, required))
          throw new ForbiddenException();
        return action(tx, current);
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      )
        throw new ConflictException('Email or role name already exists');
      throw error;
    }
  }

  private async audit(
    tx: Transaction,
    actorId: string,
    action: string,
    targetType: string,
    targetId: string
  ) {
    await tx.staffAudit.create({
      data: { actorId, action, targetType, targetId },
    });
  }
}
