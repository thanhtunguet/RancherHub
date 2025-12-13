export interface User {
  id: string;
  username: string;
  email: string;
  active: boolean;
  twoFactorEnabled: boolean;
  isFirstLogin: boolean;
  lastLoginAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface LoginRequest {
  username: string;
  password: string;
  twoFactorToken?: string;
  deviceFingerprint?: string;
  deviceName?: string;
  userAgent?: string;
  trustDevice?: boolean;
}

export interface LoginResponse {
  access_token?: string;
  user?: User;
  requiresTwoFactor?: boolean;
  message?: string;
  tempToken?: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface Setup2FAResponse {
  secret: string;
  qrCode: string;
}

export interface Verify2FARequest {
  token: string;
}

export interface TrustedDevice {
  id: string;
  deviceName: string;
  ipAddress: string | null;
  lastUsedAt: Date;
  expiresAt: Date;
  createdAt: Date;
  isCurrentDevice: boolean;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<LoginResponse>;
  logout: () => void;
  register: (userData: RegisterRequest) => Promise<User>;
  setup2FA: () => Promise<Setup2FAResponse>;
  verify2FA: (token: string) => Promise<boolean>;
  disable2FA: (token: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}