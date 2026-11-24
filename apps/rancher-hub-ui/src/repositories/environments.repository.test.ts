import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EnvironmentsRepository } from './environments.repository';

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

describe('EnvironmentsRepository', () => {
  it('findAll calls GET /api/environments and returns data', async () => {
    const mockData = [{ id: 'env-1', name: 'prod' }];
    mockGet.mockResolvedValue({ data: mockData });

    const result = await EnvironmentsRepository.findAll();

    expect(mockGet).toHaveBeenCalledWith('/api/environments');
    expect(result).toEqual(mockData);
  });

  it('findOne calls GET /api/environments/:id and returns data', async () => {
    const mockData = { id: 'env-1', name: 'prod' };
    mockGet.mockResolvedValue({ data: mockData });

    const result = await EnvironmentsRepository.findOne('env-1');

    expect(mockGet).toHaveBeenCalledWith('/api/environments/env-1');
    expect(result).toEqual(mockData);
  });

  it('create calls POST /api/environments with dto and returns data', async () => {
    const dto = { name: 'staging', color: '#00f' };
    const mockData = { id: 'env-2', ...dto };
    mockPost.mockResolvedValue({ data: mockData });

    const result = await EnvironmentsRepository.create(dto as any);

    expect(mockPost).toHaveBeenCalledWith('/api/environments', dto);
    expect(result).toEqual(mockData);
  });

  it('update calls PATCH /api/environments/:id with dto and returns data', async () => {
    const dto = { name: 'updated' };
    const mockData = { id: 'env-1', name: 'updated' };
    mockPatch.mockResolvedValue({ data: mockData });

    const result = await EnvironmentsRepository.update('env-1', dto as any);

    expect(mockPatch).toHaveBeenCalledWith('/api/environments/env-1', dto);
    expect(result).toEqual(mockData);
  });

  it('remove calls DELETE /api/environments/:id and returns data', async () => {
    mockDelete.mockResolvedValue({ data: { success: true } });

    const result = await EnvironmentsRepository.remove('env-1');

    expect(mockDelete).toHaveBeenCalledWith('/api/environments/env-1');
    expect(result).toEqual({ success: true });
  });

  it('findWithAppInstances calls GET /api/environments/:id/with-instances and returns data', async () => {
    const mockData = {
      id: 'env-1',
      name: 'prod',
      appInstances: [{ id: 'app-1', name: 'api' }],
    };
    mockGet.mockResolvedValue({ data: mockData });

    const result = await EnvironmentsRepository.findWithAppInstances('env-1');

    expect(mockGet).toHaveBeenCalledWith('/api/environments/env-1/with-instances');
    expect(result).toEqual(mockData);
  });
});
