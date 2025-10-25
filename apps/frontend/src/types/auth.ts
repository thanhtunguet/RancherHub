export interface User {
  id: string;
  username: string;
  email: string;
  twoFactorEnabled: boolean;
  isFirstLogin: boolean;
}

export interface LoginRequest {
  username: string;
  password: string;
  twoFactorToken?: string;
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
  disable2FA: () => Promise<void>;
}