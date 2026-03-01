import { NotFoundException } from '@nestjs/common';
import { SecretsService } from './secrets.service';

describe('SecretsService', () => {
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

    const service = new SecretsService(
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

    await expect(service.getSecretsByAppInstance('missing')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('loads secrets via adapter and maps fields', async () => {
    const { service, appInstanceRepository, clusterAdapterFactory } = makeDeps();

    appInstanceRepository.findOne.mockResolvedValue(sourceApp);

    const adapter = {
      getSecrets: jest.fn().mockResolvedValue([
        {
          id: 'sec-1',
          name: 'api-secret',
          namespace: 'source-ns',
          type: 'Opaque',
          data: { TOKEN: 'abc' },
          dataKeys: ['TOKEN'],
          dataSize: 1,
          labels: { app: 'api' },
          annotations: { managedBy: 'test' },
          creationTimestamp: '2026-01-01T00:00:00.000Z',
          resourceVersion: '1',
        },
      ]),
    };

    clusterAdapterFactory.createAdapter.mockResolvedValue(adapter);

    const result = await service.getSecretsByAppInstance(sourceApp.id);

    expect(adapter.getSecrets).toHaveBeenCalledWith(
      sourceApp.cluster,
      sourceApp.namespace,
    );
    expect(result).toEqual([
      expect.objectContaining({ name: 'api-secret', appInstanceId: sourceApp.id }),
    ]);
  });

  it('compares secrets with identical and different classification', async () => {
    const { service, appInstanceRepository, clusterAdapterFactory } = makeDeps();

    appInstanceRepository.findOne
      .mockResolvedValueOnce(sourceApp)
      .mockResolvedValueOnce(targetApp);

    const sourceAdapter = {
      getSecrets: jest.fn().mockResolvedValue([
        {
          id: 'sec-shared-source',
          name: 'shared',
          namespace: 'source-ns',
          type: 'Opaque',
          data: { A: '1' },
          dataKeys: ['A'],
          dataSize: 1,
          labels: {},
          annotations: {},
          creationTimestamp: '2026-01-01T00:00:00.000Z',
          resourceVersion: '1',
        },
        {
          id: 'sec-only-source',
          name: 'source-only',
          namespace: 'source-ns',
          type: 'Opaque',
          data: { B: '2' },
          dataKeys: ['B'],
          dataSize: 1,
          labels: {},
          annotations: {},
          creationTimestamp: '2026-01-01T00:00:00.000Z',
          resourceVersion: '2',
        },
      ]),
    };

    const targetAdapter = {
      getSecrets: jest.fn().mockResolvedValue([
        {
          id: 'sec-shared-target',
          name: 'shared',
          namespace: 'target-ns',
          type: 'Opaque',
          data: { A: '1' },
          dataKeys: ['A'],
          dataSize: 1,
          labels: {},
          annotations: {},
          creationTimestamp: '2026-01-01T00:00:00.000Z',
          resourceVersion: '3',
        },
        {
          id: 'sec-only-target',
          name: 'target-only',
          namespace: 'target-ns',
          type: 'Opaque',
          data: { C: '3' },
          dataKeys: ['C'],
          dataSize: 1,
          labels: {},
          annotations: {},
          creationTimestamp: '2026-01-01T00:00:00.000Z',
          resourceVersion: '4',
        },
      ]),
    };

    clusterAdapterFactory.createAdapter
      .mockResolvedValueOnce(sourceAdapter)
      .mockResolvedValueOnce(targetAdapter);

    const result = await service.compareSecretsByInstance(sourceApp.id, targetApp.id);

    expect(result.summary).toEqual({
      totalSecrets: 3,
      identical: 1,
      different: 0,
      missingInSource: 1,
      missingInTarget: 1,
    });

    const byName = new Map(result.comparisons.map((c) => [c.secretName, c]));
    expect(byName.get('shared')?.differenceType).toBe('identical');
    expect(byName.get('source-only')?.differenceType).toBe('missing-in-target');
    expect(byName.get('target-only')?.differenceType).toBe('missing-in-source');
  });

  it('returns detailed secret key comparison', async () => {
    const { service, appInstanceRepository, clusterAdapterFactory } = makeDeps();

    appInstanceRepository.findOne
      .mockResolvedValueOnce(sourceApp)
      .mockResolvedValueOnce(targetApp);

    const sourceAdapter = {
      getSecrets: jest.fn().mockResolvedValue([
        {
          id: 'sec-1',
          name: 'api-secret',
          namespace: 'source-ns',
          type: 'Opaque',
          data: { A: 'same', B: 'source-only' },
          dataKeys: ['A', 'B'],
          dataSize: 2,
          labels: {},
          annotations: {},
          creationTimestamp: '2026-01-01T00:00:00.000Z',
          resourceVersion: '1',
        },
      ]),
    };

    const targetAdapter = {
      getSecrets: jest.fn().mockResolvedValue([
        {
          id: 'sec-2',
          name: 'api-secret',
          namespace: 'target-ns',
          type: 'Opaque',
          data: { A: 'same', C: 'target-only' },
          dataKeys: ['A', 'C'],
          dataSize: 2,
          labels: {},
          annotations: {},
          creationTimestamp: '2026-01-01T00:00:00.000Z',
          resourceVersion: '2',
        },
      ]),
    };

    clusterAdapterFactory.createAdapter
      .mockResolvedValueOnce(sourceAdapter)
      .mockResolvedValueOnce(targetAdapter);

    const result = await service.getSecretDetails(
      'api-secret',
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

  it('syncs one secret key and marks operation completed', async () => {
    const {
      service,
      appInstanceRepository,
      syncOperationRepository,
      syncHistoryRepository,
      clusterAdapterFactory,
    } = makeDeps();

    appInstanceRepository.findOne.mockResolvedValue(targetApp);

    const operation = { id: 'op-sec-1', status: 'pending', endTime: null };
    syncOperationRepository.create.mockReturnValue(operation);
    syncOperationRepository.save.mockResolvedValue(operation);
    syncHistoryRepository.save.mockResolvedValue({});

    const adapter = {
      updateSecretKey: jest.fn().mockResolvedValue(undefined),
    };
    clusterAdapterFactory.createAdapter.mockResolvedValue(adapter);

    const result = await service.syncSecretKey(
      {
        sourceAppInstanceId: sourceApp.id,
        targetAppInstanceId: targetApp.id,
        secretName: 'api-secret',
        key: 'TOKEN',
        value: 'new-value',
      },
      'tester',
    );

    expect(adapter.updateSecretKey).toHaveBeenCalledWith(
      targetApp.cluster,
      targetApp.namespace,
      'api-secret',
      'TOKEN',
      'new-value',
    );
    expect(syncHistoryRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        syncOperationId: 'op-sec-1',
        serviceName: 'api-secret',
        status: 'success',
      }),
    );
    expect(syncOperationRepository.save).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: 'completed' }),
    );
    expect(result).toEqual({
      success: true,
      message: 'Secret key synced successfully',
    });
  });

  it('syncs multiple keys and writes history for each key', async () => {
    const {
      service,
      appInstanceRepository,
      syncOperationRepository,
      syncHistoryRepository,
      clusterAdapterFactory,
    } = makeDeps();

    appInstanceRepository.findOne.mockResolvedValue(targetApp);

    const operation = { id: 'op-sec-2', status: 'pending', endTime: null };
    syncOperationRepository.create.mockReturnValue(operation);
    syncOperationRepository.save.mockResolvedValue(operation);
    syncHistoryRepository.save.mockResolvedValue({});

    const adapter = {
      syncSecretKeys: jest.fn().mockResolvedValue(undefined),
    };
    clusterAdapterFactory.createAdapter.mockResolvedValue(adapter);

    const result = await service.syncSecretKeys(
      {
        sourceAppInstanceId: sourceApp.id,
        targetAppInstanceId: targetApp.id,
        secretName: 'api-secret',
        keys: { A: '1', B: '2' },
      },
      'tester',
    );

    expect(adapter.syncSecretKeys).toHaveBeenCalledWith(
      targetApp.cluster,
      targetApp.namespace,
      'api-secret',
      { A: '1', B: '2' },
    );
    expect(syncHistoryRepository.save).toHaveBeenCalledTimes(2);
    expect(syncOperationRepository.save).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: 'completed' }),
    );
    expect(result).toEqual({
      success: true,
      message: 'Secret keys synced successfully',
    });
  });

  it('marks operation failed when syncSecretKeys adapter call fails', async () => {
    const {
      service,
      appInstanceRepository,
      syncOperationRepository,
      clusterAdapterFactory,
    } = makeDeps();

    appInstanceRepository.findOne.mockResolvedValue(targetApp);

    const operation = { id: 'op-sec-3', status: 'pending', endTime: null };
    syncOperationRepository.create.mockReturnValue(operation);
    syncOperationRepository.save.mockResolvedValue(operation);

    const adapter = {
      syncSecretKeys: jest.fn().mockRejectedValue(new Error('adapter-failed')),
    };
    clusterAdapterFactory.createAdapter.mockResolvedValue(adapter);

    await expect(
      service.syncSecretKeys(
        {
          sourceAppInstanceId: sourceApp.id,
          targetAppInstanceId: targetApp.id,
          secretName: 'api-secret',
          keys: { A: '1' },
        },
        'tester',
      ),
    ).rejects.toThrow('adapter-failed');

    expect(syncOperationRepository.save).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: 'failed' }),
    );
  });
});
