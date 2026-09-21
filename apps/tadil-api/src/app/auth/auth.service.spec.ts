import * as argon2 from 'argon2';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { AuthService } from './auth.service';

jest.mock('argon2', () => ({
  hash: jest.fn(async (value: unknown) => `hashed:${String(value)}`),
  verify: jest.fn(async () => true),
  argon2id: 2,
}));

const transaction = () => ({
  $executeRaw: jest.fn(),
  staffAccount: {
    findUnique: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    count: jest.fn(),
  },
  staffRole: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  staffSession: { create: jest.fn(), updateMany: jest.fn() },
  staffToken: {
    create: jest.fn(),
    updateMany: jest.fn(),
    findUnique: jest.fn(),
  },
  staffAudit: { create: jest.fn() },
});

const database = () => {
  const tx = transaction();
  return {
    tx,
    staffAccount: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    staffRole: { findMany: jest.fn() },
    staffSession: { findUnique: jest.fn() },
    staffToken: { findUnique: jest.fn() },
    staffAudit: { create: jest.fn() },
    $transaction: jest.fn(async (callback: (value: any) => unknown) =>
      callback(tx)
    ),
  };
};

describe('AuthService', () => {
  afterEach(() => jest.clearAllMocks());

  it('rejects unknown permissions as a bad request', async () => {
    const db = database();
    const service = new AuthService(db as any);
    await expect(
      service.createRole(
        { id: 'actor', permissions: ['roles.create'], isSystemAdmin: false },
        { name: 'Invalid', permissions: ['orders.delete'] }
      )
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it('revalidates the actor inside the create-role transaction', async () => {
    const db = database();
    db.tx.staffAccount.findUnique.mockResolvedValue({
      id: 'actor',
      active: true,
      isSystemAdmin: false,
      grants: [],
      denials: [],
      roles: [
        { roleId: 'r', role: { id: 'r', name: 'Reader', permissions: [] } },
      ],
    });
    db.tx.staffRole.create.mockResolvedValue({ id: 'new-role' });
    const service = new AuthService(db as any);
    await expect(
      service.createRole(
        { id: 'actor', permissions: ['roles.create'], isSystemAdmin: false },
        { name: 'Delegated', permissions: ['orders.read'] }
      )
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(db.tx.staffRole.create).not.toHaveBeenCalled();
    expect(db.tx.$executeRaw).toHaveBeenCalled();
  });

  it('validates password strength and revokes sessions and tokens under lock', async () => {
    const db = database();
    db.staffAccount.findUnique.mockResolvedValue({
      id: 'account',
      active: true,
      passwordHash: 'old',
    });
    db.tx.staffAccount.updateMany.mockResolvedValue({ count: 1 });
    const service = new AuthService(db as any);

    await expect(
      service.changePassword('account', 'old', 'weak-password')
    ).rejects.toBeInstanceOf(BadRequestException);
    await service.changePassword('account', 'old', 'Strong-password1!');

    expect(argon2.hash).toHaveBeenCalled();
    expect(db.tx.$executeRaw).toHaveBeenCalled();
    expect(db.tx.staffAccount.updateMany).toHaveBeenCalled();
    expect(db.tx.staffSession.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { accountId: 'account', revokedAt: null },
        data: expect.objectContaining({ revokedAt: expect.any(Date) }),
      })
    );
    expect(db.tx.staffToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { accountId: 'account', usedAt: null },
        data: expect.objectContaining({ usedAt: expect.any(Date) }),
      })
    );
    expect(db.tx.staffAudit.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'password.changed' }),
      })
    );
  });
});
