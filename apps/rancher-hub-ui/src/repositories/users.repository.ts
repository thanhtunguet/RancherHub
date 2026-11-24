import { getApiClient } from '../api/client';
import type { CreateUserDto, UpdateUserDto, DeleteUserDto, User, UserStats, PaginatedResponse } from '../api/types';

export const UsersRepository = {
  create: (dto: CreateUserDto) =>
    getApiClient().post<User>('/api/users', dto).then(r => r.data),

  findAll: (params?: { search?: string; active?: boolean; page?: number; limit?: number }) =>
    getApiClient().get<PaginatedResponse<User>>('/api/users', { params }).then(r => r.data),

  findOne: (id: string) =>
    getApiClient().get<User>(`/api/users/${id}`).then(r => r.data),

  update: (id: string, dto: UpdateUserDto) =>
    getApiClient().patch<User>(`/api/users/${id}`, dto).then(r => r.data),

  remove: (id: string, dto: DeleteUserDto) =>
    getApiClient().delete(`/api/users/${id}`, { data: dto }).then(r => r.data),

  getStats: () =>
    getApiClient().get('/api/users/stats').then(r => {
      const d = r.data as Record<string, unknown>;
      return {
        total: (d.total as number) ?? 0,
        active: (d.active as number) ?? 0,
        inactive: (d.inactive as number) ?? 0,
        twoFactorEnabled: (d.with2FA ?? d.twoFactorEnabled ?? 0) as number,
      } as UserStats;
    }),
};
