import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Require2FAGuard } from './require-2fa.guard';

describe('Require2FAGuard', () => {
  const makeContext = (user?: any) =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
      getHandler: () => 'handler',
      getClass: () => 'class',
    }) as unknown as ExecutionContext;

  it('allows request when endpoint is marked AllowWithout2FA', async () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(true),
    } as unknown as Reflector;

    const authService = {
      findById: jest.fn(),
    } as any;

    const guard = new Require2FAGuard(reflector, authService);

    await expect(guard.canActivate(makeContext())).resolves.toBe(true);
    expect(authService.findById).not.toHaveBeenCalled();
  });

  it('throws ForbiddenException when user is missing from request', async () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(false),
    } as unknown as Reflector;

    const authService = {
      findById: jest.fn(),
    } as any;

    const guard = new Require2FAGuard(reflector, authService);

    await expect(guard.canActivate(makeContext(undefined))).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('throws ForbiddenException when user cannot be loaded', async () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(false),
    } as unknown as Reflector;

    const authService = {
      findById: jest.fn().mockResolvedValue(null),
    } as any;

    const guard = new Require2FAGuard(reflector, authService);

    await expect(
      guard.canActivate(makeContext({ userId: 'user-1' })),
    ).rejects.toThrow(ForbiddenException);
  });

  it('throws ForbiddenException when user has not enabled 2FA', async () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(false),
    } as unknown as Reflector;

    const authService = {
      findById: jest.fn().mockResolvedValue({
        id: 'user-1',
        twoFactorEnabled: false,
      }),
    } as any;

    const guard = new Require2FAGuard(reflector, authService);

    await expect(
      guard.canActivate(makeContext({ userId: 'user-1' })),
    ).rejects.toThrow(ForbiddenException);
  });

  it('allows request when user has 2FA enabled', async () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(false),
    } as unknown as Reflector;

    const authService = {
      findById: jest.fn().mockResolvedValue({
        id: 'user-1',
        twoFactorEnabled: true,
      }),
    } as any;

    const guard = new Require2FAGuard(reflector, authService);

    await expect(
      guard.canActivate(makeContext({ userId: 'user-1' })),
    ).resolves.toBe(true);
  });
});
