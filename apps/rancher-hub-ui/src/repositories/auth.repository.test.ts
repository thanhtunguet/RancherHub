import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthRepository } from './auth.repository';

// Mock the api/client module
vi.mock('../api/client', () => ({
  getApiClient: vi.fn(),
}));

import { getApiClient } from '../api/client';

const mockGet = vi.fn();
const mockPost = vi.fn();

const mockClient = {
  get: mockGet,
  post: mockPost,
};

beforeEach(() => {
  vi.clearAllMocks();
  (getApiClient as ReturnType<typeof vi.fn>).mockReturnValue(mockClient);
});

describe('AuthRepository', () => {
  describe('login', () => {
    it('calls POST /api/auth/login with dto body and returns data', async () => {
      const dto = { username: 'admin', password: 'secret' };
      const mockData = { access_token: 'jwt-token', user: { id: 'u1', username: 'admin', email: 'admin@example.com' } };
      mockPost.mockResolvedValue({ data: mockData });

      const result = await AuthRepository.login(dto);

      expect(getApiClient).toHaveBeenCalled();
      expect(mockPost).toHaveBeenCalledWith('/api/auth/login', dto);
      expect(result).toEqual(mockData);
    });

    it('returns data with requires2FA flag when 2FA is needed', async () => {
      const dto = { username: 'admin', password: 'secret' };
      const mockData = { requires2FA: true, tempToken: 'temp-123' };
      mockPost.mockResolvedValue({ data: mockData });

      const result = await AuthRepository.login(dto);

      expect(result).toEqual(mockData);
    });

    it('forwards optional 2FA token in the request body', async () => {
      const dto = { username: 'admin', password: 'secret', twoFactorToken: '123456' };
      mockPost.mockResolvedValue({ data: { access_token: 'jwt' } });

      await AuthRepository.login(dto);

      expect(mockPost).toHaveBeenCalledWith('/api/auth/login', dto);
    });
  });

  describe('getProfile', () => {
    it('calls GET /api/auth/profile and returns user profile data', async () => {
      const mockData = {
        id: 'user-1',
        username: 'admin',
        email: 'admin@example.com',
        twoFactorEnabled: false,
      };
      mockGet.mockResolvedValue({ data: mockData });

      const result = await AuthRepository.getProfile();

      expect(mockGet).toHaveBeenCalledWith('/api/auth/profile');
      expect(result).toEqual(mockData);
    });
  });

  describe('setup2FA', () => {
    it('calls POST /api/auth/setup-2fa with no body and returns qrCode and secret', async () => {
      const mockData = { qrCode: 'data:image/png;base64,...', secret: 'JBSWY3DPEHPK3PXP' };
      mockPost.mockResolvedValue({ data: mockData });

      const result = await AuthRepository.setup2FA();

      expect(mockPost).toHaveBeenCalledWith('/api/auth/setup-2fa');
      expect(result).toEqual(mockData);
    });
  });

  describe('verify2FA', () => {
    it('calls POST /api/auth/verify-2fa with token dto and returns data', async () => {
      const dto = { token: '654321' };
      const mockData = { message: '2FA verified successfully' };
      mockPost.mockResolvedValue({ data: mockData });

      const result = await AuthRepository.verify2FA(dto);

      expect(mockPost).toHaveBeenCalledWith('/api/auth/verify-2fa', dto);
      expect(result).toEqual(mockData);
    });
  });

  describe('changePassword', () => {
    it('calls POST /api/auth/change-password with dto body and returns data', async () => {
      const dto = { currentPassword: 'old-pass', newPassword: 'new-pass' };
      const mockData = { message: 'Password changed successfully' };
      mockPost.mockResolvedValue({ data: mockData });

      const result = await AuthRepository.changePassword(dto);

      expect(mockPost).toHaveBeenCalledWith('/api/auth/change-password', dto);
      expect(result).toEqual(mockData);
    });
  });
});
