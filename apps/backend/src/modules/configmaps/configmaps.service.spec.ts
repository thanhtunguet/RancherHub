import { NotFoundException } from '@nestjs/common';
import { ConfigMapsService } from './configmaps.service';

describe('ConfigMapsService', () => {
  const makeDeps = () => {
    const appInstanceRepository = {
      findOne: jest.fn(),
    };

    const syncOperationRepository = {
      create: jest.fn(),
      save: jest.fn(),
    };

    const syncHistoryRepository = {
      save: jest.fn(),
    };

    const rancherApiService = {} as any;

    const clusterAdapterFactory = {
      createAdapter: jest.fn(),
    };

    const service = new ConfigMapsService(
      appInstanceRepository as any,
      syncOperationRepository as any,
      syncHistoryRepository as any,
      rancherApiService,
      clusterAdapterFactory as any,
    );

    return {
      service,
      appInstanceRepository,
      syncOperationRepository,
      syncHistoryRepository,
      clusterAdapterFactory,
    };
  };

  const sourceApp = {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'source-app',
    cluster: 'source-cluster',
    namespace: 'source-ns',
    environmentId: 'env-source',
    environment: { name: 'dev' },
    rancherSite: { id: 'rs-1' },
    genericClusterSite: null,
  };

  const targetApp = {
    id: '22222222-2222-4222-8222-222222222222',
    name: 'target-app',
    cluster: 'target-cluster',
    namespace: 'target-ns',
    environmentId: 'env-target',
    environment: { name: 'prod' },
    rancherSite: null,
    genericClusterSite: { id: 'gs-1' },
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('throws NotFoundException when app instance does not exist', async () => {
    const { service, appInstanceRepository } = makeDeps();

    appInstanceRepository.findOne.mockResolvedValue(null);

    await expect(service.getConfigMapsByAppInstance('missing')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('gets configmaps via adapter and appends appInstanceId', async () => {
    const { service, appInstanceRepository, clusterAdapterFactory } = makeDeps();

    appInstanceRepository.findOne.mockResolvedValue(sourceApp);

    const adapter = {
      getConfigMaps: jest.fn().mockResolvedValue([
        {
          id: 'cm-1',
          name: 'api-config',
          namespace: 'source-ns',
          data: { A: '1' },
          binaryData: {},
          labels: {},
          annotations: {},
          creationTimestamp: '2026-01-01T00:00:00.000Z',
          resourceVersion: '1',
          dataKeys: ['A'],
          dataSize: 1,
        },
      ]),
    };

    clusterAdapterFactory.createAdapter.mockResolvedValue(adapter);

    const result = await service.getConfigMapsByAppInstance(sourceApp.id);

    expect(clusterAdapterFactory.createAdapter).toHaveBeenCalledWith(sourceApp);
    expect(adapter.getConfigMaps).toHaveBeenCalledWith(
      sourceApp.cluster,
      sourceApp.namespace,
    );
    expect(result).toEqual([
      expect.objectContaining({ name: 'api-config', appInstanceId: sourceApp.id }),
    ]);
  });

  it('compares configmaps and summarizes identical, different, missing', async () => {
    const { service, appInstanceRepository, clusterAdapterFactory } = makeDeps();

    appInstanceRepository.findOne
      .mockResolvedValueOnce(sourceApp)
      .mockResolvedValueOnce(targetApp);

    const sourceAdapter = {
      getConfigMaps: jest.fn().mockResolvedValue([
        {
          id: 'cm-shared-src',
          name: 'shared',
          namespace: 'source-ns',
          data: { A: '1' },
          binaryData: {},
          labels: { app: 'api' },
          annotations: {},
          creationTimestamp: '2026-01-01T00:00:00.000Z',
          resourceVersion: '1',
          dataKeys: ['A'],
          dataSize: 1,
        },
        {
          id: 'cm-src-only',
          name: 'source-only',
          namespace: 'source-ns',
          data: { B: '2' },
          binaryData: {},
          labels: {},
          annotations: {},
          creationTimestamp: '2026-01-01T00:00:00.000Z',
          resourceVersion: '2',
          dataKeys: ['B'],
          dataSize: 1,
        },
      ]),
    };

    const targetAdapter = {
      getConfigMaps: jest.fn().mockResolvedValue([
        {
          id: 'cm-shared-tgt',
          name: 'shared',
          namespace: 'target-ns',
          data: { A: '9' },
          binaryData: {},
          labels: { app: 'api' },
          annotations: {},
          creationTimestamp: '2026-01-01T00:00:00.000Z',
          resourceVersion: '3',
          dataKeys: ['A'],
          dataSize: 1,
        },
        {
          id: 'cm-tgt-only',
          name: 'target-only',
          namespace: 'target-ns',
          data: { C: '3' },
          binaryData: {},
          labels: {},
          annotations: {},
          creationTimestamp: '2026-01-01T00:00:00.000Z',
          resourceVersion: '4',
          dataKeys: ['C'],
          dataSize: 1,
        },
      ]),
    };

    clusterAdapterFactory.createAdapter
      .mockResolvedValueOnce(sourceAdapter)
      .mockResolvedValueOnce(targetAdapter);

    const result = await service.compareConfigMapsByInstance(
      sourceApp.id,
      targetApp.id,
    );

    expect(result.summary).toEqual({
      totalConfigMaps: 3,
      identical: 0,
      different: 1,
      missingInSource: 1,
      missingInTarget: 1,
    });

    expect(result.comparisons.map((c) => c.differenceType)).toEqual([
      'missing_in_source',
      'missing_in_target',
      'different',
    ]);
  });

  it('returns detailed key comparison and detects missing/changed keys', async () => {
    const { service, appInstanceRepository, clusterAdapterFactory } = makeDeps();

    appInstanceRepository.findOne
      .mockResolvedValueOnce(sourceApp)
      .mockResolvedValueOnce(targetApp);

    const sourceAdapter = {
      getConfigMaps: jest.fn().mockResolvedValue([
        {
          id: 'cm-1',
          name: 'api-config',
          namespace: 'source-ns',
          data: { A: 'same', B: 'only-source' },
          binaryData: {},
          labels: {},
          annotations: {},
          creationTimestamp: '2026-01-01T00:00:00.000Z',
          resourceVersion: '1',
          dataKeys: ['A', 'B'],
          dataSize: 2,
        },
      ]),
    };

    const targetAdapter = {
      getConfigMaps: jest.fn().mockResolvedValue([
        {
          id: 'cm-2',
          name: 'api-config',
          namespace: 'target-ns',
          data: { A: 'same', C: 'only-target' },
          binaryData: {},
          labels: {},
          annotations: {},
          creationTimestamp: '2026-01-01T00:00:00.000Z',
          resourceVersion: '2',
          dataKeys: ['A', 'C'],
          dataSize: 2,
        },
      ]),
    };

    clusterAdapterFactory.createAdapter
      .mockResolvedValueOnce(sourceAdapter)
      .mockResolvedValueOnce(targetAdapter);

    const result = await service.getConfigMapDetails(
      'api-config',
      sourceApp.id,
      targetApp.id,
    );

    expect(result.summary).toEqual({
      totalKeys: 3,
      identical: 1,
      different: 0,
      missingInSource: 1,
      missingInTarget: 1,
    });

    expect(result.keyComparisons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'A', identical: true }),
        expect.objectContaining({ key: 'B', missingInTarget: true }),
        expect.objectContaining({ key: 'C', missingInSource: true }),
      ]),
    );
  });

  it('syncs a single configmap key and marks operation completed', async () => {
    const {
      service,
      appInstanceRepository,
      syncOperationRepository,
      syncHistoryRepository,
      clusterAdapterFactory,
    } = makeDeps();

    appInstanceRepository.findOne
      .mockResolvedValueOnce(sourceApp)
      .mockResolvedValueOnce(targetApp);

    const operation = { id: 'op-cm-1', status: 'pending', endTime: null };
    syncOperationRepository.create.mockReturnValue(operation);
    syncOperationRepository.save.mockResolvedValue(operation);
    syncHistoryRepository.save.mockResolvedValue({});

    const adapter = {
      updateConfigMapKey: jest.fn().mockResolvedValue(undefined),
    };
    clusterAdapterFactory.createAdapter.mockResolvedValue(adapter);

    const result = await service.syncConfigMapKey(
      {
        sourceAppInstanceId: sourceApp.id,
        targetAppInstanceId: targetApp.id,
        configMapName: 'api-config',
        key: 'LOG_LEVEL',
        value: 'debug',
      },
      'tester',
    );

    expect(adapter.updateConfigMapKey).toHaveBeenCalledWith(
      targetApp.cluster,
      targetApp.namespace,
      'api-config',
      'LOG_LEVEL',
      'debug',
    );
    expect(syncHistoryRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        syncOperationId: 'op-cm-1',
        status: 'success',
        initiatedBy: 'tester',
      }),
    );
    expect(syncOperationRepository.save).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: 'completed' }),
    );
    expect(result.success).toBe(true);
  });

  it('marks operation failed when syncing multiple keys throws', async () => {
    const {
      service,
      appInstanceRepository,
      syncOperationRepository,
      syncHistoryRepository,
      clusterAdapterFactory,
    } = makeDeps();

    appInstanceRepository.findOne
      .mockResolvedValueOnce(sourceApp)
      .mockResolvedValueOnce(targetApp);

    const operation = { id: 'op-cm-2', status: 'pending', endTime: null };
    syncOperationRepository.create.mockReturnValue(operation);
    syncOperationRepository.save.mockResolvedValue(operation);
    syncHistoryRepository.save.mockResolvedValue({});

    const adapter = {
      syncConfigMapKeys: jest.fn().mockRejectedValue(new Error('cluster-failed')),
    };
    clusterAdapterFactory.createAdapter.mockResolvedValue(adapter);

    await expect(
      service.syncConfigMapKeys(
        {
          sourceAppInstanceId: sourceApp.id,
          targetAppInstanceId: targetApp.id,
          configMapName: 'api-config',
          keys: { A: '1', B: '2' },
        },
        'tester',
      ),
    ).rejects.toThrow('cluster-failed');

    expect(syncHistoryRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        syncOperationId: 'op-cm-2',
        status: 'failed',
        error: 'cluster-failed',
      }),
    );
    expect(syncOperationRepository.save).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: 'failed' }),
    );
  });
});
