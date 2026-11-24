import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppInstancesRepository } from './app-instances.repository';

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

describe('AppInstancesRepository', () => {
  it('findAll sends undefined env param when env not provided', async () => {
    mockGet.mockResolvedValue({ data: [] });

    await AppInstancesRepository.findAll();

    expect(mockGet).toHaveBeenCalledWith('/api/app-instances', {
      params: { env: undefined },
    });
  });

  it('findAll sends env param when provided', async () => {
    mockGet.mockResolvedValue({ data: [] });

    await AppInstancesRepository.findAll('env-1');

    expect(mockGet).toHaveBeenCalledWith('/api/app-instances', {
      params: { env: 'env-1' },
    });
  });

  it('findOne calls GET /api/app-instances/:id and returns data', async () => {
    const mockData = { id: 'app-1', name: 'api' };
    mockGet.mockResolvedValue({ data: mockData });

    const result = await AppInstancesRepository.findOne('app-1');

    expect(mockGet).toHaveBeenCalledWith('/api/app-instances/app-1');
    expect(result).toEqual(mockData);
  });

  it('create calls POST /api/app-instances with dto and returns data', async () => {
    const dto = {
      name: 'api',
      cluster: 'c1',
      namespace: 'default',
      environmentId: 'env-1',
      clusterType: 'rancher',
    };
    const mockData = { id: 'app-2', ...dto };
    mockPost.mockResolvedValue({ data: mockData });

    const result = await AppInstancesRepository.create(dto as any);

    expect(mockPost).toHaveBeenCalledWith('/api/app-instances', dto);
    expect(result).toEqual(mockData);
  });

  it('update calls PATCH /api/app-instances/:id with dto and returns data', async () => {
    const dto = { namespace: 'new-ns' };
    const mockData = { id: 'app-1', namespace: 'new-ns' };
    mockPatch.mockResolvedValue({ data: mockData });

    const result = await AppInstancesRepository.update('app-1', dto as any);

    expect(mockPatch).toHaveBeenCalledWith('/api/app-instances/app-1', dto);
    expect(result).toEqual(mockData);
  });

  it('remove calls DELETE /api/app-instances/:id and returns data', async () => {
    mockDelete.mockResolvedValue({ data: { success: true } });

    const result = await AppInstancesRepository.remove('app-1');

    expect(mockDelete).toHaveBeenCalledWith('/api/app-instances/app-1');
    expect(result).toEqual({ success: true });
  });

  it('findByEnvironment calls GET /api/app-instances/by-environment/:id and returns data', async () => {
    const mockData = [{ id: 'app-1' }];
    mockGet.mockResolvedValue({ data: mockData });

    const result = await AppInstancesRepository.findByEnvironment('env-1');

    expect(mockGet).toHaveBeenCalledWith('/api/app-instances/by-environment/env-1');
    expect(result).toEqual(mockData);
  });

  it('findBySite calls GET /api/app-instances/by-site/:id and returns data', async () => {
    const mockData = [{ id: 'app-1' }];
    mockGet.mockResolvedValue({ data: mockData });

    const result = await AppInstancesRepository.findBySite('site-1');

    expect(mockGet).toHaveBeenCalledWith('/api/app-instances/by-site/site-1');
    expect(result).toEqual(mockData);
  });
});
