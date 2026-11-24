import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ServicesRepository } from './services.repository';

// Mock the api/client module
vi.mock('../api/client', () => ({
  getApiClient: vi.fn(),
}));

import { getApiClient } from '../api/client';

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPut = vi.fn();

const mockClient = {
  get: mockGet,
  post: mockPost,
  put: mockPut,
};

beforeEach(() => {
  vi.clearAllMocks();
  (getApiClient as ReturnType<typeof vi.fn>).mockReturnValue(mockClient);
});

describe('ServicesRepository', () => {
  describe('getByEnvironment', () => {
    it('calls GET /api/services with env param and returns data', async () => {
      const mockData = [{ id: 'svc-1', name: 'my-service' }];
      mockGet.mockResolvedValue({ data: mockData });

      const result = await ServicesRepository.getByEnvironment('env-123');

      expect(getApiClient).toHaveBeenCalled();
      expect(mockGet).toHaveBeenCalledWith('/api/services', {
        params: { env: 'env-123', type: undefined, search: undefined },
      });
      expect(result).toEqual(mockData);
    });

    it('passes type and search params when provided', async () => {
      mockGet.mockResolvedValue({ data: [] });

      await ServicesRepository.getByEnvironment('env-abc', 'Deployment', 'nginx');

      expect(mockGet).toHaveBeenCalledWith('/api/services', {
        params: { env: 'env-abc', type: 'Deployment', search: 'nginx' },
      });
    });
  });

  describe('getByAppInstance', () => {
    it('calls GET /api/services/by-app-instance/:id and returns data', async () => {
      const mockData = [{ id: 'svc-2', name: 'another-service' }];
      mockGet.mockResolvedValue({ data: mockData });

      const result = await ServicesRepository.getByAppInstance('app-instance-1');

      expect(mockGet).toHaveBeenCalledWith('/api/services/by-app-instance/app-instance-1', {
        params: { type: undefined, search: undefined },
      });
      expect(result).toEqual(mockData);
    });

    it('passes optional type and search params', async () => {
      mockGet.mockResolvedValue({ data: [] });

      await ServicesRepository.getByAppInstance('app-instance-1', 'StatefulSet', 'redis');

      expect(mockGet).toHaveBeenCalledWith('/api/services/by-app-instance/app-instance-1', {
        params: { type: 'StatefulSet', search: 'redis' },
      });
    });
  });

  describe('syncServices', () => {
    it('calls POST /api/services/sync with dto body and returns data', async () => {
      const dto = {
        sourceEnvironmentId: 'env-src',
        targetEnvironmentId: 'env-tgt',
        serviceIds: ['svc-1', 'svc-2'],
        targetAppInstanceIds: ['app-1'],
      };
      const mockData = { synced: 2 };
      mockPost.mockResolvedValue({ data: mockData });

      const result = await ServicesRepository.syncServices(dto);

      expect(mockPost).toHaveBeenCalledWith('/api/services/sync', dto);
      expect(result).toEqual(mockData);
    });
  });

  describe('compareByInstance', () => {
    it('calls GET /api/services/compare/by-instance with source and target params and returns data', async () => {
      const mockData = {
        summary: { identical: 3, different: 1, missingInSource: 0, missingInTarget: 0 },
        comparisons: [],
      };
      mockGet.mockResolvedValue({ data: mockData });

      const result = await ServicesRepository.compareByInstance('src-instance', 'tgt-instance');

      expect(mockGet).toHaveBeenCalledWith('/api/services/compare/by-instance', {
        params: { source: 'src-instance', target: 'tgt-instance' },
      });
      expect(result).toEqual(mockData);
    });
  });

  describe('updateServiceImage', () => {
    it('calls PUT /api/services/:id/update-image with tag body and returns data', async () => {
      const mockData = { updated: true };
      mockPut.mockResolvedValue({ data: mockData });

      const result = await ServicesRepository.updateServiceImage('svc-42', 'v2.0.0');

      expect(mockPut).toHaveBeenCalledWith('/api/services/svc-42/update-image', { tag: 'v2.0.0' });
      expect(result).toEqual(mockData);
    });
  });
});
