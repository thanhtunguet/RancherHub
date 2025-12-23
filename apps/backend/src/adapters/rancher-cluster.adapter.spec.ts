import { RancherClusterAdapter } from './rancher-cluster.adapter';
import { RancherApiService } from '../services/rancher-api.service';
import { RancherSite } from '../entities/rancher-site.entity';

describe('RancherClusterAdapter', () => {
  let adapter: RancherClusterAdapter;
  let rancherApiService: jest.Mocked<RancherApiService>;
  let mockRancherSite: RancherSite;

  beforeEach(async () => {
    mockRancherSite = {
      id: 'site-1',
      name: 'Test Rancher Site',
      url: 'https://rancher.example.com',
      token: 'token-123',
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as RancherSite;

    rancherApiService = {
      testConnection: jest.fn(),
      getNamespaces: jest.fn(),
      getDeploymentsFromK8sApi: jest.fn(),
      updateWorkloadImage: jest.fn(),
      getConfigMapsFromK8sApi: jest.fn(),
      updateConfigMapKey: jest.fn(),
      syncConfigMapKeys: jest.fn(),
      getSecretsFromK8sApi: jest.fn(),
      updateSecretKey: jest.fn(),
      syncSecretKeys: jest.fn(),
    } as any;

    adapter = new RancherClusterAdapter(rancherApiService, mockRancherSite);
  });

  describe('testConnection', () => {
    it('should delegate to RancherApiService', async () => {
      const expectedResult = {
        success: true,
        message: 'Connection successful',
      };

      rancherApiService.testConnection.mockResolvedValue(expectedResult);

      const result = await adapter.testConnection();

      expect(rancherApiService.testConnection).toHaveBeenCalledWith(
        mockRancherSite,
      );
      expect(result).toEqual(expectedResult);
    });
  });

  describe('getNamespaces', () => {
    it('should delegate to RancherApiService', async () => {
      const expectedNamespaces = [
        {
          id: 'ns-1',
          name: 'default',
          projectId: 'proj-1',
          clusterId: 'cluster-1',
        },
      ];

      rancherApiService.getNamespaces.mockResolvedValue(expectedNamespaces);

      const result = await adapter.getNamespaces('cluster-1');

      expect(rancherApiService.getNamespaces).toHaveBeenCalledWith(
        mockRancherSite,
        'cluster-1',
      );
      expect(result).toEqual(expectedNamespaces);
    });
  });

  describe('getDeployments', () => {
    it('should delegate to RancherApiService', async () => {
      const expectedWorkloads = [
        {
          id: 'workload-1',
          name: 'app-deployment',
          type: 'deployment',
          namespaceId: 'default',
          state: 'active',
          image: 'app:v1.0.0',
          scale: 3,
          availableReplicas: 3,
          containers: [],
        },
      ];

      rancherApiService.getDeploymentsFromK8sApi.mockResolvedValue(
        expectedWorkloads,
      );

      const result = await adapter.getDeployments('cluster-1', 'default');

      expect(rancherApiService.getDeploymentsFromK8sApi).toHaveBeenCalledWith(
        mockRancherSite,
        'cluster-1',
        'default',
      );
      expect(result).toEqual(expectedWorkloads);
    });
  });

  describe('updateWorkloadImage', () => {
    it('should delegate to RancherApiService', async () => {
      const expectedResult = { success: true };

      rancherApiService.updateWorkloadImage.mockResolvedValue(expectedResult);

      const result = await adapter.updateWorkloadImage(
        'cluster-1',
        'default',
        'app-deployment',
        'deployment',
        'app:v2',
      );

      expect(rancherApiService.updateWorkloadImage).toHaveBeenCalledWith(
        mockRancherSite,
        'cluster-1',
        'default',
        'app-deployment',
        'deployment',
        'app:v2',
      );
      expect(result).toEqual(expectedResult);
    });
  });

  describe('getConfigMaps', () => {
    it('should delegate to RancherApiService', async () => {
      const expectedConfigMaps = [
        {
          name: 'app-config',
          namespace: 'default',
          data: { key1: 'value1' },
        },
      ];

      rancherApiService.getConfigMapsFromK8sApi.mockResolvedValue(
        expectedConfigMaps,
      );

      const result = await adapter.getConfigMaps('cluster-1', 'default');

      expect(rancherApiService.getConfigMapsFromK8sApi).toHaveBeenCalledWith(
        mockRancherSite,
        'cluster-1',
        'default',
      );
      expect(result).toEqual(expectedConfigMaps);
    });
  });

  describe('getSecrets', () => {
    it('should delegate to RancherApiService', async () => {
      const expectedSecrets = [
        {
          name: 'app-secret',
          namespace: 'default',
          type: 'Opaque',
        },
      ];

      rancherApiService.getSecretsFromK8sApi.mockResolvedValue(expectedSecrets);

      const result = await adapter.getSecrets('cluster-1', 'default');

      expect(rancherApiService.getSecretsFromK8sApi).toHaveBeenCalledWith(
        mockRancherSite,
        'cluster-1',
        'default',
      );
      expect(result).toEqual(expectedSecrets);
    });
  });
});
