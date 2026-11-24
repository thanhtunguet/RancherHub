import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConfigMapsRepository } from './configmaps.repository';

// Mock the api/client module
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

describe('ConfigMapsRepository', () => {
  describe('compareByInstance', () => {
    it('calls GET /api/configmaps/compare/by-instance with source and target params and returns data', async () => {
      const mockData = {
        sourceAppInstanceId: 'src-1',
        targetAppInstanceId: 'tgt-1',
        summary: { identical: 2, different: 1, missingInSource: 0, missingInTarget: 0 },
        comparisons: [],
      };
      mockGet.mockResolvedValue({ data: mockData });

      const result = await ConfigMapsRepository.compareByInstance('src-1', 'tgt-1');

      expect(getApiClient).toHaveBeenCalled();
      expect(mockGet).toHaveBeenCalledWith('/api/configmaps/compare/by-instance', {
        params: { source: 'src-1', target: 'tgt-1' },
      });
      expect(result).toEqual(mockData);
    });
  });

  describe('getDetails', () => {
    it('calls GET /api/configmaps/:name/details with source and target params and returns data', async () => {
      const mockData = {
        configMapName: 'app-config',
        sourceAppInstanceId: 'src-1',
        targetAppInstanceId: 'tgt-1',
        sourceConfigMap: { name: 'app-config', data: { key1: 'val1' } },
        targetConfigMap: { name: 'app-config', data: { key1: 'val2' } },
        keyComparisons: [],
        summary: { totalKeys: 1, identical: 0, different: 1, missingInSource: 0, missingInTarget: 0 },
      };
      mockGet.mockResolvedValue({ data: mockData });

      const result = await ConfigMapsRepository.getDetails('app-config', 'src-1', 'tgt-1');

      expect(mockGet).toHaveBeenCalledWith('/api/configmaps/app-config/details', {
        params: { source: 'src-1', target: 'tgt-1' },
      });
      expect(result).toEqual(mockData);
    });

    it('encodes the configMapName correctly in the URL path', async () => {
      mockGet.mockResolvedValue({ data: {} });

      await ConfigMapsRepository.getDetails('my-config-map', 'src-x', 'tgt-x');

      expect(mockGet).toHaveBeenCalledWith('/api/configmaps/my-config-map/details', {
        params: { source: 'src-x', target: 'tgt-x' },
      });
    });
  });

  describe('syncKey', () => {
    it('calls POST /api/configmaps/sync-key with dto body and returns data', async () => {
      const dto = {
        sourceAppInstanceId: 'src-1',
        targetAppInstanceId: 'tgt-1',
        configMapName: 'app-config',
        key: 'DATABASE_URL',
        value: 'postgres://localhost/db',
      };
      const mockData = { synced: true };
      mockPost.mockResolvedValue({ data: mockData });

      const result = await ConfigMapsRepository.syncKey(dto);

      expect(mockPost).toHaveBeenCalledWith('/api/configmaps/sync-key', dto);
      expect(result).toEqual(mockData);
    });
  });

  describe('syncKeys', () => {
    it('calls POST /api/configmaps/sync-keys with dto body and returns data', async () => {
      const dto = {
        sourceAppInstanceId: 'src-1',
        targetAppInstanceId: 'tgt-1',
        configMapName: 'app-config',
        keys: {
          DATABASE_URL: 'postgres://localhost/db',
          REDIS_URL: 'redis://localhost:6379',
        },
      };
      const mockData = { synced: 2 };
      mockPost.mockResolvedValue({ data: mockData });

      const result = await ConfigMapsRepository.syncKeys(dto);

      expect(mockPost).toHaveBeenCalledWith('/api/configmaps/sync-keys', dto);
      expect(result).toEqual(mockData);
    });
  });
});
