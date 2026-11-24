import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SitesRepository } from './sites.repository';

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

describe('SitesRepository', () => {
  it('findAll calls GET /api/sites and returns data', async () => {
    const mockData = [{ id: 'site-1', name: 'prod' }];
    mockGet.mockResolvedValue({ data: mockData });

    const result = await SitesRepository.findAll();

    expect(mockGet).toHaveBeenCalledWith('/api/sites');
    expect(result).toEqual(mockData);
  });

  it('findOne calls GET /api/sites/:id and returns data', async () => {
    const mockData = { id: 'site-1', name: 'prod' };
    mockGet.mockResolvedValue({ data: mockData });

    const result = await SitesRepository.findOne('site-1');

    expect(mockGet).toHaveBeenCalledWith('/api/sites/site-1');
    expect(result).toEqual(mockData);
  });

  it('create calls POST /api/sites with dto and returns data', async () => {
    const dto = { name: 'dev', url: 'https://rancher.dev', token: 'tok' };
    const mockData = { id: 'site-2', ...dto };
    mockPost.mockResolvedValue({ data: mockData });

    const result = await SitesRepository.create(dto as any);

    expect(mockPost).toHaveBeenCalledWith('/api/sites', dto);
    expect(result).toEqual(mockData);
  });

  it('update calls PATCH /api/sites/:id with dto and returns data', async () => {
    const dto = { name: 'updated' };
    const mockData = { id: 'site-1', name: 'updated' };
    mockPatch.mockResolvedValue({ data: mockData });

    const result = await SitesRepository.update('site-1', dto as any);

    expect(mockPatch).toHaveBeenCalledWith('/api/sites/site-1', dto);
    expect(result).toEqual(mockData);
  });

  it('remove calls DELETE /api/sites/:id and returns data', async () => {
    mockDelete.mockResolvedValue({ data: { success: true } });

    const result = await SitesRepository.remove('site-1');

    expect(mockDelete).toHaveBeenCalledWith('/api/sites/site-1');
    expect(result).toEqual({ success: true });
  });

  it('testConnection calls POST /api/sites/:id/test and returns data', async () => {
    const mockData = { success: true, message: 'OK' };
    mockPost.mockResolvedValue({ data: mockData });

    const result = await SitesRepository.testConnection('site-1');

    expect(mockPost).toHaveBeenCalledWith('/api/sites/site-1/test');
    expect(result).toEqual(mockData);
  });

  it('activate calls POST /api/sites/:id/activate and returns data', async () => {
    const mockData = { id: 'site-1', active: true };
    mockPost.mockResolvedValue({ data: mockData });

    const result = await SitesRepository.activate('site-1');

    expect(mockPost).toHaveBeenCalledWith('/api/sites/site-1/activate');
    expect(result).toEqual(mockData);
  });

  it('deactivate calls POST /api/sites/:id/deactivate and returns data', async () => {
    const mockData = { id: 'site-1', active: false };
    mockPost.mockResolvedValue({ data: mockData });

    const result = await SitesRepository.deactivate('site-1');

    expect(mockPost).toHaveBeenCalledWith('/api/sites/site-1/deactivate');
    expect(result).toEqual(mockData);
  });

  it('getActiveSite calls GET /api/sites/active and returns data', async () => {
    const mockData = { id: 'site-1', active: true };
    mockGet.mockResolvedValue({ data: mockData });

    const result = await SitesRepository.getActiveSite();

    expect(mockGet).toHaveBeenCalledWith('/api/sites/active');
    expect(result).toEqual(mockData);
  });

  it('getClusters calls GET /api/sites/:id/clusters and returns data', async () => {
    const mockData = [{ id: 'c1', name: 'cluster-a' }];
    mockGet.mockResolvedValue({ data: mockData });

    const result = await SitesRepository.getClusters('site-1');

    expect(mockGet).toHaveBeenCalledWith('/api/sites/site-1/clusters');
    expect(result).toEqual(mockData);
  });

  it('getNamespaces calls GET /api/sites/:id/namespaces with clusterId param', async () => {
    const mockData = [{ id: 'n1', name: 'default' }];
    mockGet.mockResolvedValue({ data: mockData });

    const result = await SitesRepository.getNamespaces('site-1', 'cluster-1');

    expect(mockGet).toHaveBeenCalledWith('/api/sites/site-1/namespaces', {
      params: { clusterId: 'cluster-1' },
    });
    expect(result).toEqual(mockData);
  });

  it('getNamespaces sends undefined clusterId when not provided', async () => {
    mockGet.mockResolvedValue({ data: [] });

    await SitesRepository.getNamespaces('site-1');

    expect(mockGet).toHaveBeenCalledWith('/api/sites/site-1/namespaces', {
      params: { clusterId: undefined },
    });
  });
});
