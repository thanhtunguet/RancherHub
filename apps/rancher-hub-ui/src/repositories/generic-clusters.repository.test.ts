import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GenericClustersRepository } from './generic-clusters.repository';

vi.mock('../api/client', () => ({
  getApiClient: vi.fn(),
}));

import { getApiClient } from '../api/client';

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPut = vi.fn();
const mockDelete = vi.fn();

const mockClient = {
  get: mockGet,
  post: mockPost,
  put: mockPut,
  delete: mockDelete,
};

beforeEach(() => {
  vi.clearAllMocks();
  (getApiClient as ReturnType<typeof vi.fn>).mockReturnValue(mockClient);
});

describe('GenericClustersRepository', () => {
  it('findAll calls GET /api/generic-clusters and returns data', async () => {
    const mockData = [{ id: 'gc-1', name: 'cluster-a' }];
    mockGet.mockResolvedValue({ data: mockData });

    const result = await GenericClustersRepository.findAll();

    expect(mockGet).toHaveBeenCalledWith('/api/generic-clusters');
    expect(result).toEqual(mockData);
  });

  it('findOne calls GET /api/generic-clusters/:id and returns data', async () => {
    const mockData = { id: 'gc-1', name: 'cluster-a' };
    mockGet.mockResolvedValue({ data: mockData });

    const result = await GenericClustersRepository.findOne('gc-1');

    expect(mockGet).toHaveBeenCalledWith('/api/generic-clusters/gc-1');
    expect(result).toEqual(mockData);
  });

  it('create calls POST /api/generic-clusters with dto and returns data', async () => {
    const dto = { name: 'cluster-a', kubeconfig: 'yaml' };
    const mockData = { id: 'gc-2', ...dto };
    mockPost.mockResolvedValue({ data: mockData });

    const result = await GenericClustersRepository.create(dto as any);

    expect(mockPost).toHaveBeenCalledWith('/api/generic-clusters', dto);
    expect(result).toEqual(mockData);
  });

  it('update calls PUT /api/generic-clusters/:id with dto and returns data', async () => {
    const dto = { name: 'cluster-renamed' };
    const mockData = { id: 'gc-1', name: 'cluster-renamed' };
    mockPut.mockResolvedValue({ data: mockData });

    const result = await GenericClustersRepository.update('gc-1', dto as any);

    expect(mockPut).toHaveBeenCalledWith('/api/generic-clusters/gc-1', dto);
    expect(result).toEqual(mockData);
  });

  it('remove calls DELETE /api/generic-clusters/:id and returns data', async () => {
    mockDelete.mockResolvedValue({ data: { success: true } });

    const result = await GenericClustersRepository.remove('gc-1');

    expect(mockDelete).toHaveBeenCalledWith('/api/generic-clusters/gc-1');
    expect(result).toEqual({ success: true });
  });

  it('testConnection calls POST /api/generic-clusters/:id/test and returns data', async () => {
    const mockData = { success: true };
    mockPost.mockResolvedValue({ data: mockData });

    const result = await GenericClustersRepository.testConnection('gc-1');

    expect(mockPost).toHaveBeenCalledWith('/api/generic-clusters/gc-1/test');
    expect(result).toEqual(mockData);
  });

  it('setActive calls POST /api/generic-clusters/:id/set-active with active flag', async () => {
    const mockData = { id: 'gc-1', active: true };
    mockPost.mockResolvedValue({ data: mockData });

    const result = await GenericClustersRepository.setActive('gc-1', true);

    expect(mockPost).toHaveBeenCalledWith('/api/generic-clusters/gc-1/set-active', { active: true });
    expect(result).toEqual(mockData);
  });

  it('getNamespaces calls GET /api/generic-clusters/:id/namespaces and returns data', async () => {
    const mockData = [{ name: 'default' }];
    mockGet.mockResolvedValue({ data: mockData });

    const result = await GenericClustersRepository.getNamespaces('gc-1');

    expect(mockGet).toHaveBeenCalledWith('/api/generic-clusters/gc-1/namespaces');
    expect(result).toEqual(mockData);
  });
});
