import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UsersRepository } from './users.repository';

vi.mock('../api/client', () => ({
  getApiClient: vi.fn(),
}));

import { getApiClient } from '../api/client';

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPatch = vi.fn();
const mockDelete = vi.fn();

const mockClient = {
  get: mockGet,
  post: mockPost,
  patch: mockPatch,
  delete: mockDelete,
};

beforeEach(() => {
  vi.clearAllMocks();
  (getApiClient as ReturnType<typeof vi.fn>).mockReturnValue(mockClient);
});

describe('UsersRepository', () => {
  it('findAll calls GET /api/users with optional params and returns data', async () => {
    const params = { search: 'alice', page: 1, limit: 10 };
    const mockData = { users: [], total: 0 };
    mockGet.mockResolvedValue({ data: mockData });

    const result = await UsersRepository.findAll(params);

    expect(mockGet).toHaveBeenCalledWith('/api/users', { params });
    expect(result).toEqual(mockData);
  });

  it('findOne calls GET /api/users/:id and returns data', async () => {
    const mockData = { id: 'u1', username: 'alice' };
    mockGet.mockResolvedValue({ data: mockData });

    const result = await UsersRepository.findOne('u1');

    expect(mockGet).toHaveBeenCalledWith('/api/users/u1');
    expect(result).toEqual(mockData);
  });

  it('create calls POST /api/users with dto and returns data', async () => {
    const dto = { username: 'alice', email: 'a@example.com', password: 'pass' };
    const mockData = { id: 'u1', username: 'alice' };
    mockPost.mockResolvedValue({ data: mockData });

    const result = await UsersRepository.create(dto as any);

    expect(mockPost).toHaveBeenCalledWith('/api/users', dto);
    expect(result).toEqual(mockData);
  });

  it('update calls PATCH /api/users/:id with dto and returns data', async () => {
    const dto = { active: false };
    const mockData = { id: 'u1', active: false };
    mockPatch.mockResolvedValue({ data: mockData });

    const result = await UsersRepository.update('u1', dto as any);

    expect(mockPatch).toHaveBeenCalledWith('/api/users/u1', dto);
    expect(result).toEqual(mockData);
  });

  it('remove calls DELETE /api/users/:id with body data and returns data', async () => {
    const dto = { reason: 'cleanup' };
    mockDelete.mockResolvedValue({ data: { success: true } });

    const result = await UsersRepository.remove('u1', dto as any);

    expect(mockDelete).toHaveBeenCalledWith('/api/users/u1', { data: dto });
    expect(result).toEqual({ success: true });
  });

  it('getStats normalizes with2FA field to twoFactorEnabled', async () => {
    mockGet.mockResolvedValue({
      data: { total: 10, active: 8, inactive: 2, with2FA: 3 },
    });

    const result = await UsersRepository.getStats();

    expect(mockGet).toHaveBeenCalledWith('/api/users/stats');
    expect(result).toEqual({
      total: 10,
      active: 8,
      inactive: 2,
      twoFactorEnabled: 3,
    });
  });

  it('getStats falls back to twoFactorEnabled field when with2FA is absent', async () => {
    mockGet.mockResolvedValue({
      data: { total: 11, active: 9, inactive: 2, twoFactorEnabled: 4 },
    });

    const result = await UsersRepository.getStats();

    expect(result).toEqual({
      total: 11,
      active: 9,
      inactive: 2,
      twoFactorEnabled: 4,
    });
  });
});
