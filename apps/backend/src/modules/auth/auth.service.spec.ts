import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';

jest.mock('speakeasy', () => ({
  generateSecret: jest.fn(),
  totp: {
    verify: jest.fn(),
  },
}));

jest.mock('qrcode', () => ({
  toDataURL: jest.fn(),
}));

describe('AuthService', () => {
  const makeService = () => {
    const userRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };

    const jwtService = {
      sign: jest.fn(),
    };

    const trustedDevicesService = {
      isDeviceTrusted: jest.fn(),
      updateLastUsed: jest.fn(),
      trustDevice: jest.fn(),
      revokeAllUserDevices: jest.fn(),
    };

    const service = new AuthService(
      userRepository as any,
      jwtService as any,
      trustedDevicesService as any,
    );

    return { service, userRepository, jwtService, trustedDevicesService };
  };

  const createUser = (overrides: Record<string, any> = {}) => ({
    id: 'user-1',
    username: 'alice',
    email: 'alice@example.com',
    password: 'hashed',
    twoFactorEnabled: false,
    twoFactorSecret: null,
    active: true,
    isFirstLogin: true,
    validatePassword: jest.fn().mockResolvedValue(true),
    ...overrides,
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('throws UnauthorizedException for invalid credentials', async () => {
    const { service, userRepository } = makeService();

    userRepository.findOne.mockResolvedValue(null);

    await expect(
      service.login({ username: 'alice', password: 'bad' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException for disabled account', async () => {
    const { service, userRepository } = makeService();

    const user = createUser({ active: false });
    userRepository.findOne.mockResolvedValue(user);

    await expect(
      service.login({ username: 'alice', password: 'pw' }),
    ).rejects.toThrow('Account is disabled');
  });

  it('returns requiresTwoFactor when 2FA is enabled and device not trusted', async () => {
    const { service, userRepository, trustedDevicesService, jwtService } =
      makeService();

    const user = createUser({
      twoFactorEnabled: true,
      twoFactorSecret: 'secret',
    });

    userRepository.findOne.mockResolvedValue(user);
    trustedDevicesService.isDeviceTrusted.mockResolvedValue(false);
    jwtService.sign.mockReturnValue('temp-jwt');

    const result = await service.login({
      username: 'alice',
      password: 'pw',
      deviceFingerprint: 'fp-1',
    });

    expect(result).toEqual(
      expect.objectContaining({
        requiresTwoFactor: true,
        tempToken: 'temp-jwt',
      }),
    );
    expect(trustedDevicesService.updateLastUsed).not.toHaveBeenCalled();
  });

  it('bypasses 2FA for trusted device and updates last used', async () => {
    const { service, userRepository, trustedDevicesService, jwtService } =
      makeService();

    const user = createUser({
      twoFactorEnabled: true,
      twoFactorSecret: 'secret',
      isFirstLogin: false,
    });

    userRepository.findOne.mockResolvedValue(user);
    trustedDevicesService.isDeviceTrusted.mockResolvedValue(true);
    jwtService.sign.mockReturnValue('access-jwt');

    const result = await service.login({
      username: 'alice',
      password: 'pw',
      deviceFingerprint: 'fp-1',
    });

    expect(trustedDevicesService.updateLastUsed).toHaveBeenCalledWith(
      user.id,
      'fp-1',
    );
    expect(result).toEqual(
      expect.objectContaining({ access_token: 'access-jwt' }),
    );
  });

  it('rejects invalid 2FA token', async () => {
    const { service, userRepository, trustedDevicesService } = makeService();
    const speakeasy = require('speakeasy');

    const user = createUser({
      twoFactorEnabled: true,
      twoFactorSecret: 'secret',
    });

    userRepository.findOne.mockResolvedValue(user);
    trustedDevicesService.isDeviceTrusted.mockResolvedValue(false);
    speakeasy.totp.verify.mockReturnValue(false);

    await expect(
      service.login({
        username: 'alice',
        password: 'pw',
        deviceFingerprint: 'fp-1',
        twoFactorToken: '123456',
      }),
    ).rejects.toThrow('Invalid 2FA token');
  });

  it('trusts device when login includes valid 2FA and trustDevice options', async () => {
    const { service, userRepository, trustedDevicesService, jwtService } =
      makeService();
    const speakeasy = require('speakeasy');

    const user = createUser({
      twoFactorEnabled: true,
      twoFactorSecret: 'secret',
      isFirstLogin: false,
    });

    userRepository.findOne.mockResolvedValue(user);
    trustedDevicesService.isDeviceTrusted.mockResolvedValue(false);
    speakeasy.totp.verify.mockReturnValue(true);
    jwtService.sign.mockReturnValue('access-jwt');

    await service.login(
      {
        username: 'alice',
        password: 'pw',
        twoFactorToken: '123456',
        trustDevice: true,
        deviceFingerprint: 'fp-1',
        deviceName: 'Chrome',
        userAgent: 'UA',
      },
      '127.0.0.1',
    );

    expect(trustedDevicesService.trustDevice).toHaveBeenCalledWith(
      user.id,
      expect.objectContaining({
        deviceFingerprint: 'fp-1',
        deviceName: 'Chrome',
        userAgent: 'UA',
      }),
      '127.0.0.1',
    );
  });

  it('enables 2FA when verify2FA token is valid', async () => {
    const { service, userRepository } = makeService();
    const speakeasy = require('speakeasy');

    const user = createUser({ twoFactorSecret: 'secret' });
    userRepository.findOne.mockResolvedValue(user);
    speakeasy.totp.verify.mockReturnValue(true);

    const result = await service.verify2FA('user-1', { token: '123456' });

    expect(result).toBe(true);
    expect(userRepository.update).toHaveBeenCalledWith('user-1', {
      twoFactorEnabled: true,
    });
  });

  it('throws BadRequestException when verify2FA called without setup', async () => {
    const { service, userRepository } = makeService();

    userRepository.findOne.mockResolvedValue(createUser({ twoFactorSecret: null }));

    await expect(service.verify2FA('user-1', { token: '123456' })).rejects.toThrow(
      BadRequestException,
    );
  });

  it('disables 2FA only with valid token', async () => {
    const { service, userRepository } = makeService();
    const speakeasy = require('speakeasy');

    userRepository.findOne.mockResolvedValue(
      createUser({ twoFactorEnabled: true, twoFactorSecret: 'secret' }),
    );

    speakeasy.totp.verify.mockReturnValue(true);

    await service.disable2FA('user-1', '123456');

    expect(userRepository.update).toHaveBeenCalledWith('user-1', {
      twoFactorEnabled: false,
      twoFactorSecret: null,
    });
  });

  it('rejects disable2FA with invalid token', async () => {
    const { service, userRepository } = makeService();
    const speakeasy = require('speakeasy');

    userRepository.findOne.mockResolvedValue(
      createUser({ twoFactorEnabled: true, twoFactorSecret: 'secret' }),
    );
    speakeasy.totp.verify.mockReturnValue(false);

    await expect(service.disable2FA('user-1', '123456')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('revokes all trusted devices on successful password change', async () => {
    const { service, userRepository, trustedDevicesService } = makeService();

    const user = createUser();
    user.validatePassword = jest.fn().mockResolvedValue(true);
    userRepository.findOne.mockResolvedValue(user);

    await service.changePassword('user-1', 'old', 'new');

    expect(userRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ password: 'new' }),
    );
    expect(trustedDevicesService.revokeAllUserDevices).toHaveBeenCalledWith(
      'user-1',
    );
  });

  it('rejects password change when current password is incorrect', async () => {
    const { service, userRepository } = makeService();

    const user = createUser();
    user.validatePassword = jest.fn().mockResolvedValue(false);
    userRepository.findOne.mockResolvedValue(user);

    await expect(service.changePassword('user-1', 'bad', 'new')).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
