import { ExecutionContext } from '@nestjs/common';
import { PermissionsGuard } from './permissions.guard';
import { SessionGuard } from './session.guard';

const context = (request: any, metadata: Record<string, unknown> = {}) =>
  ({
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => ({ metadata }),
    getClass: () => ({ metadata: {} }),
  } as unknown as ExecutionContext & { metadata: Record<string, unknown> });

const reflector = {
  getAllAndOverride: jest.fn((key: string, targets: unknown[]) => {
    const execution = targets[0] as unknown as {
      metadata?: Record<string, unknown>;
    };
    return execution.metadata?.[key];
  }),
};

describe('staff authentication guards', () => {
  const user = { id: 'staff-1', permissions: ['staff.read'] };
  const auth = {
    loadSession: jest.fn(async () => ({ user })),
    hasPermissions: jest.fn((candidate: typeof user, required: string[]) =>
      required.every((permission) => candidate.permissions.includes(permission))
    ),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.STAFF_ALLOWED_ORIGINS = 'https://admin.example';
  });

  it('supports login session, GET /me, then a CSRF-protected mutation', async () => {
    const sessionGuard = new SessionGuard(reflector as any, auth as any);
    const permissionsGuard = new PermissionsGuard(
      reflector as any,
      auth as any
    );
    const request: any = {
      method: 'GET',
      headers: {},
      cookies: { staff_session: 'opaque', staff_csrf: 'csrf' },
    };
    await expect(sessionGuard.canActivate(context(request))).resolves.toBe(
      true
    );
    expect(request.staff).toEqual(user);

    const meRequest = { ...request, method: 'GET' };
    await expect(
      sessionGuard.canActivate(context(meRequest, { authenticatedRoute: true }))
    ).resolves.toBe(true);

    const mutation = {
      ...request,
      method: 'POST',
      headers: { origin: 'https://admin.example', 'x-csrf-token': 'csrf' },
    };
    await expect(
      sessionGuard.canActivate(
        context(mutation, { permissions: ['staff.read'] })
      )
    ).resolves.toBe(true);
    expect(
      permissionsGuard.canActivate(
        context(mutation, { permissions: ['staff.read'] })
      )
    ).toBe(true);
    expect(auth.loadSession).toHaveBeenCalledWith('opaque', 'csrf', 'POST');
  });

  it('rejects a mutation when CSRF exists only in the cookie', async () => {
    const sessionGuard = new SessionGuard(reflector as any, auth as any);
    const request = {
      method: 'POST',
      headers: { origin: 'https://admin.example' },
      cookies: { staff_session: 'opaque', staff_csrf: 'csrf' },
    };
    await expect(
      sessionGuard.canActivate(context(request))
    ).rejects.toMatchObject({ status: 403 });
    expect(auth.loadSession).not.toHaveBeenCalled();
  });

  it('denies routes without public, authenticated, or permission classification', () => {
    const guard = new PermissionsGuard(reflector as any, auth as any);
    const request = { staff: user, staffUser: user };
    expect(() => guard.canActivate(context(request))).toThrow(
      'Permission required'
    );
  });
});
