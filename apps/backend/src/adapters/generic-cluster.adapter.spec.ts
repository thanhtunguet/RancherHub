import { Test, TestingModule } from '@nestjs/testing';
import { GenericClusterAdapter } from './generic-cluster.adapter';
import * as k8s from '@kubernetes/client-node';

describe('GenericClusterAdapter', () => {
  let adapter: GenericClusterAdapter;
  const mockKubeconfig = `
apiVersion: v1
kind: Config
clusters:
- cluster:
    server: https://test-cluster.example.com
  name: test-cluster
contexts:
- context:
    cluster: test-cluster
    user: test-user
  name: test-context
current-context: test-context
users:
- name: test-user
  user:
    token: test-token
`;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GenericClusterAdapter],
    }).compile();

    adapter = new GenericClusterAdapter(mockKubeconfig, 'test-cluster');
  });

  describe('constructor', () => {
    it('should initialize with valid kubeconfig', () => {
      expect(adapter).toBeDefined();
    });

    it('should throw error with invalid kubeconfig', () => {
      expect(() => {
        new GenericClusterAdapter('invalid-yaml', 'test-cluster');
      }).toThrow();
    });
  });

  describe('testConnection', () => {
    it('should test connection successfully', async () => {
      // Mock the Kubernetes API
      const mockListNamespace = jest.fn().mockResolvedValue({
        items: [{ metadata: { name: 'default' } }],
      });

      jest.spyOn(k8s.KubeConfig.prototype, 'makeApiClient').mockReturnValue({
        listNamespace: mockListNamespace,
      } as any);

      const result = await adapter.testConnection();

      expect(result.success).toBe(true);
      expect(result.message).toBe('Connection successful');
      expect(result.data).toBeDefined();
    });

    it('should handle connection failure', async () => {
      const mockListNamespace = jest.fn().mockRejectedValue(
        new Error('Connection refused'),
      );

      jest.spyOn(k8s.KubeConfig.prototype, 'makeApiClient').mockReturnValue({
        listNamespace: mockListNamespace,
      } as any);

      const result = await adapter.testConnection();

      expect(result.success).toBe(false);
      expect(result.message).toContain('Connection failed');
    });
  });

  describe('getNamespaces', () => {
    it('should return namespaces list', async () => {
      const mockNamespaces = [
        { metadata: { name: 'default', uid: 'uid-1' } },
        { metadata: { name: 'kube-system', uid: 'uid-2' } },
      ];

      const mockListNamespace = jest.fn().mockResolvedValue({
        items: mockNamespaces,
      });

      jest.spyOn(k8s.KubeConfig.prototype, 'makeApiClient').mockReturnValue({
        listNamespace: mockListNamespace,
      } as any);

      const namespaces = await adapter.getNamespaces();

      expect(namespaces).toHaveLength(2);
      expect(namespaces[0].name).toBe('default');
      expect(namespaces[1].name).toBe('kube-system');
    });

    it('should ignore clusterId parameter', async () => {
      const mockListNamespace = jest.fn().mockResolvedValue({
        items: [{ metadata: { name: 'default' } }],
      });

      jest.spyOn(k8s.KubeConfig.prototype, 'makeApiClient').mockReturnValue({
        listNamespace: mockListNamespace,
      } as any);

      const namespaces = await adapter.getNamespaces('ignored-cluster-id');

      expect(namespaces).toBeDefined();
      expect(mockListNamespace).toHaveBeenCalled();
    });
  });

  describe('getDeployments', () => {
    it('should return deployments, daemonsets, and statefulsets', async () => {
      const mockDeployments = {
        items: [
          {
            metadata: { name: 'app-deployment', uid: 'dep-1' },
            spec: { replicas: 3 },
            status: { availableReplicas: 3 },
          },
        ],
      };

      const mockDaemonSets = {
        items: [
          {
            metadata: { name: 'app-daemonset', uid: 'ds-1' },
            spec: {},
            status: { numberReady: 2 },
          },
        ],
      };

      const mockStatefulSets = {
        items: [
          {
            metadata: { name: 'app-statefulset', uid: 'sts-1' },
            spec: { replicas: 2 },
            status: { readyReplicas: 2 },
          },
        ],
      };

      jest.spyOn(k8s.KubeConfig.prototype, 'makeApiClient').mockReturnValue({
        listNamespacedDeployment: jest.fn().mockResolvedValue(mockDeployments),
        listNamespacedDaemonSet: jest.fn().mockResolvedValue(mockDaemonSets),
        listNamespacedStatefulSet: jest.fn().mockResolvedValue(mockStatefulSets),
      } as any);

      const workloads = await adapter.getDeployments('test-cluster', 'default');

      expect(workloads).toHaveLength(3);
      expect(workloads[0].type).toBe('deployment');
      expect(workloads[1].type).toBe('daemonset');
      expect(workloads[2].type).toBe('statefulset');
    });
  });

  describe('updateWorkloadImage', () => {
    it('should update deployment image', async () => {
      const mockRead = jest.fn().mockResolvedValue({
        body: {
          spec: {
            template: {
              spec: {
                containers: [{ name: 'app', image: 'app:v1' }],
              },
            },
          },
        },
      });

      const mockReplace = jest.fn().mockResolvedValue({ body: {} });

      jest.spyOn(k8s.KubeConfig.prototype, 'makeApiClient').mockReturnValue({
        readNamespacedDeployment: mockRead,
        replaceNamespacedDeployment: mockReplace,
      } as any);

      await adapter.updateWorkloadImage(
        'test-cluster',
        'default',
        'app-deployment',
        'deployment',
        'app:v2',
      );

      expect(mockRead).toHaveBeenCalled();
      expect(mockReplace).toHaveBeenCalled();
    });
  });

  describe('getConfigMaps', () => {
    it('should return configmaps excluding system ones', async () => {
      const mockConfigMaps = {
        items: [
          {
            metadata: {
              name: 'app-config',
              namespace: 'default',
              creationTimestamp: '2024-01-01T00:00:00Z',
            },
            data: { key1: 'value1' },
          },
          {
            metadata: {
              name: 'kube-root-ca.crt',
              namespace: 'default',
            },
            data: {},
          },
        ],
      };

      jest.spyOn(k8s.KubeConfig.prototype, 'makeApiClient').mockReturnValue({
        listNamespacedConfigMap: jest.fn().mockResolvedValue(mockConfigMaps),
      } as any);

      const configMaps = await adapter.getConfigMaps('test-cluster', 'default');

      // Should filter out system configmaps
      expect(configMaps.length).toBeGreaterThan(0);
      expect(
        configMaps.find((cm) => cm.name === 'kube-root-ca.crt'),
      ).toBeUndefined();
    });
  });

  describe('getSecrets', () => {
    it('should return secrets excluding system ones', async () => {
      const mockSecrets = {
        items: [
          {
            metadata: {
              name: 'app-secret',
              namespace: 'default',
            },
            type: 'Opaque',
            data: { key1: Buffer.from('value1').toString('base64') },
          },
          {
            metadata: {
              name: 'default-token-xyz',
              namespace: 'default',
            },
            type: 'kubernetes.io/service-account-token',
          },
        ],
      };

      jest.spyOn(k8s.KubeConfig.prototype, 'makeApiClient').mockReturnValue({
        listNamespacedSecret: jest.fn().mockResolvedValue(mockSecrets),
      } as any);

      const secrets = await adapter.getSecrets('test-cluster', 'default');

      // Should filter out system secrets
      expect(secrets.length).toBeGreaterThan(0);
      expect(
        secrets.find((s) => s.name === 'default-token-xyz'),
      ).toBeUndefined();
    });
  });
});

