import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SecretsRepository } from './secrets.repository';

vi.mock('../api/client', () => ({
  getApiClient: vi.fn(),
}));

import { getApiClient } from '../api/client';

const mockGet = vi.fn();
const mockPost = vi.fn();

const mockClient = {
  get: mockGet,
  post: mockPost,
};

beforeEach(() => {
  vi.clearAllMocks();
  (getApiClient as ReturnType<typeof vi.fn>).mockReturnValue(mockClient);
});

describe('SecretsRepository', () => {
  it('getByAppInstance calls GET /api/secrets/by-app-instance/:id and returns data', async () => {
    const mockData = [{ name: 'secret-a' }];
    mockGet.mockResolvedValue({ data: mockData });

    const result = await SecretsRepository.getByAppInstance('app-1');

    expect(mockGet).toHaveBeenCalledWith('/api/secrets/by-app-instance/app-1');
    expect(result).toEqual(mockData);
  });

  it('compareByInstance calls GET /api/secrets/compare/by-instance with params and returns data', async () => {
    const mockData = { comparisons: [] };
    mockGet.mockResolvedValue({ data: mockData });

    const result = await SecretsRepository.compareByInstance('src-1', 'tgt-1');

    expect(mockGet).toHaveBeenCalledWith('/api/secrets/compare/by-instance', {
      params: { source: 'src-1', target: 'tgt-1' },
    });
    expect(result).toEqual(mockData);
  });

  it('getDetails calls GET /api/secrets/:name/details with params and returns data', async () => {
    const mockData = { secretName: 'db-secret' };
    mockGet.mockResolvedValue({ data: mockData });

    const result = await SecretsRepository.getDetails('db-secret', 'src-1', 'tgt-1');

    expect(mockGet).toHaveBeenCalledWith('/api/secrets/db-secret/details', {
      params: { source: 'src-1', target: 'tgt-1' },
    });
    expect(result).toEqual(mockData);
  });

  it('syncKey calls POST /api/secrets/sync-key with dto and returns data', async () => {
    const dto = {
      sourceAppInstanceId: 'src-1',
      targetAppInstanceId: 'tgt-1',
      secretName: 'db-secret',
      key: 'password',
      value: 'new-pass',
    };
    const mockData = { synced: true };
    mockPost.mockResolvedValue({ data: mockData });

    const result = await SecretsRepository.syncKey(dto as any);

    expect(mockPost).toHaveBeenCalledWith('/api/secrets/sync-key', dto);
    expect(result).toEqual(mockData);
  });

  it('syncKeys calls POST /api/secrets/sync-keys with dto and returns data', async () => {
    const dto = {
      sourceAppInstanceId: 'src-1',
      targetAppInstanceId: 'tgt-1',
      secretName: 'db-secret',
      keys: { password: 'new-pass', username: 'new-user' },
    };
    const mockData = { synced: 2 };
    mockPost.mockResolvedValue({ data: mockData });

    const result = await SecretsRepository.syncKeys(dto as any);

    expect(mockPost).toHaveBeenCalledWith('/api/secrets/sync-keys', dto);
    expect(result).toEqual(mockData);
  });
});
