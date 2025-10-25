// Re-export User from auth to avoid duplication
import type { User } from './auth';
export type { User } from './auth';

export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  adminTwoFactorToken: string;
}

export interface UpdateUserRequest {
  username?: string;
  email?: string;
  password?: string;
  active?: boolean;
  adminTwoFactorToken: string;
}

export interface DeleteUserRequest {
  adminTwoFactorToken: string;
}

export interface QueryUserParams {
  search?: string;
  active?: boolean;
  page?: number;
  limit?: number;
}

export interface UserListResponse {
  data: User[];
  total: number;
  page: number;
  limit: number;
}

export interface UserStats {
  total: number;
  active: number;
  inactive: number;
  with2FA: number;
}
