import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HarborSitesRepository } from './harbor-sites.repository';

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

describe('HarborSitesRepository', () => {
  it('findAll calls GET /api/harbor-sites and returns data', async () => {
    const mockData = [{ id: 'h1', name: 'harbor' }];
    mockGet.mockResolvedValue({ data: mockData });

    const result = await HarborSitesRepository.findAll();

    expect(mockGet).toHaveBeenCalledWith('/api/harbor-sites');
    expect(result).toEqual(mockData);
  });

  it('findOne calls GET /api/harbor-sites/:id and returns data', async () => {
    const mockData = { id: 'h1', name: 'harbor' };
    mockGet.mockResolvedValue({ data: mockData });

    const result = await HarborSitesRepository.findOne('h1');

    expect(mockGet).toHaveBeenCalledWith('/api/harbor-sites/h1');
    expect(result).toEqual(mockData);
  });

  it('create calls POST /api/harbor-sites with dto and returns data', async () => {
    const dto = { name: 'harbor', url: 'https://harbor.local', username: 'admin', password: 'pass' };
    const mockData = { id: 'h1', ...dto };
    mockPost.mockResolvedValue({ data: mockData });

    const result = await HarborSitesRepository.create(dto as any);

    expect(mockPost).toHaveBeenCalledWith('/api/harbor-sites', dto);
    expect(result).toEqual(mockData);
  });

  it('update calls PATCH /api/harbor-sites/:id with dto and returns data', async () => {
    const dto = { name: 'harbor-updated' };
    const mockData = { id: 'h1', name: 'harbor-updated' };
    mockPatch.mockResolvedValue({ data: mockData });

    const result = await HarborSitesRepository.update('h1', dto as any);

    expect(mockPatch).toHaveBeenCalledWith('/api/harbor-sites/h1', dto);
    expect(result).toEqual(mockData);
  });

  it('remove calls DELETE /api/harbor-sites/:id and returns data', async () => {
    mockDelete.mockResolvedValue({ data: { success: true } });

    const result = await HarborSitesRepository.remove('h1');

    expect(mockDelete).toHaveBeenCalledWith('/api/harbor-sites/h1');
    expect(result).toEqual({ success: true });
  });

  it('testConnection calls POST /api/harbor-sites/test-connection with dto', async () => {
    const dto = { url: 'https://harbor.local', username: 'admin', password: 'pass' };
    const mockData = { success: true, message: 'OK' };
    mockPost.mockResolvedValue({ data: mockData });

    const result = await HarborSitesRepository.testConnection(dto as any);

    expect(mockPost).toHaveBeenCalledWith('/api/harbor-sites/test-connection', dto);
    expect(result).toEqual(mockData);
  });

  it('testSiteConnection calls POST /api/harbor-sites/:id/test and returns data', async () => {
    const mockData = { success: true, message: 'OK' };
    mockPost.mockResolvedValue({ data: mockData });

    const result = await HarborSitesRepository.testSiteConnection('h1');

    expect(mockPost).toHaveBeenCalledWith('/api/harbor-sites/h1/test');
    expect(result).toEqual(mockData);
  });

  it('activate calls POST /api/harbor-sites/:id/activate and returns data', async () => {
    const mockData = { id: 'h1', active: true };
    mockPost.mockResolvedValue({ data: mockData });

    const result = await HarborSitesRepository.activate('h1');

    expect(mockPost).toHaveBeenCalledWith('/api/harbor-sites/h1/activate');
    expect(result).toEqual(mockData);
  });

  it('deactivate calls POST /api/harbor-sites/:id/deactivate and returns data', async () => {
    const mockData = { id: 'h1', active: false };
    mockPost.mockResolvedValue({ data: mockData });

    const result = await HarborSitesRepository.deactivate('h1');

    expect(mockPost).toHaveBeenCalledWith('/api/harbor-sites/h1/deactivate');
    expect(result).toEqual(mockData);
  });

  it('getActiveSite calls GET /api/harbor-sites/active and returns data', async () => {
    const mockData = { id: 'h1', active: true };
    mockGet.mockResolvedValue({ data: mockData });

    const result = await HarborSitesRepository.getActiveSite();

    expect(mockGet).toHaveBeenCalledWith('/api/harbor-sites/active');
    expect(result).toEqual(mockData);
  });

  it('getProjects calls GET /api/harbor-sites/:id/projects and returns data', async () => {
    const mockData = [{ name: 'project-a' }];
    mockGet.mockResolvedValue({ data: mockData });

    const result = await HarborSitesRepository.getProjects('h1');

    expect(mockGet).toHaveBeenCalledWith('/api/harbor-sites/h1/projects');
    expect(result).toEqual(mockData);
  });

  it('getRepositories encodes project name in URL path', async () => {
    mockGet.mockResolvedValue({ data: [] });

    await HarborSitesRepository.getRepositories('h1', 'my project');

    expect(mockGet).toHaveBeenCalledWith('/api/harbor-sites/h1/repositories/my%20project');
  });

  it('getArtifacts encodes project and repository names in URL path', async () => {
    mockGet.mockResolvedValue({ data: [] });

    await HarborSitesRepository.getArtifacts('h1', 'my project', 'repo/name');

    expect(mockGet).toHaveBeenCalledWith('/api/harbor-sites/h1/artifacts/my%20project/repo%2Fname');
  });

  it('getTagDetail encodes project/repository/tag in URL path', async () => {
    mockGet.mockResolvedValue({ data: {} });

    await HarborSitesRepository.getTagDetail('h1', 'my project', 'repo/name', 'v1.0.0+build');

    expect(mockGet).toHaveBeenCalledWith('/api/harbor-sites/h1/tag-detail/my%20project/repo%2Fname/v1.0.0%2Bbuild');
  });

  it('testImageSize calls GET /api/harbor-sites/:id/test-image-size with imageTag param', async () => {
    const mockData = { size: 123 };
    mockGet.mockResolvedValue({ data: mockData });

    const result = await HarborSitesRepository.testImageSize('h1', 'repo/app:v1');

    expect(mockGet).toHaveBeenCalledWith('/api/harbor-sites/h1/test-image-size', {
      params: { imageTag: 'repo/app:v1' },
    });
    expect(result).toEqual(mockData);
  });
});
