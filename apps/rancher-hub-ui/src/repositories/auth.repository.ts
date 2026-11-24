import { getApiClient } from '../api/client';
import type { LoginDto, RegisterDto, Verify2FADto, Disable2FADto, ChangePasswordDto, AuthResponse, UserProfile, TwoFASetupResponse } from '../api/types';

export const AuthRepository = {
  login: (dto: LoginDto) =>
    getApiClient().post<AuthResponse>('/api/auth/login', dto).then(r => r.data),

  register: (dto: RegisterDto) =>
    getApiClient().post('/api/auth/register', dto).then(r => r.data),

  getProfile: () =>
    getApiClient().get<UserProfile>('/api/auth/profile').then(r => r.data),

  setup2FA: () =>
    getApiClient().post<TwoFASetupResponse>('/api/auth/setup-2fa', {}).then(r => r.data),

  verify2FA: (dto: Verify2FADto) =>
    getApiClient().post('/api/auth/verify-2fa', dto).then(r => r.data),

  disable2FA: (dto: Disable2FADto) =>
    getApiClient().post('/api/auth/disable-2fa', dto).then(r => r.data),

  changePassword: (dto: ChangePasswordDto) =>
    getApiClient().post('/api/auth/change-password', dto).then(r => r.data),
};
