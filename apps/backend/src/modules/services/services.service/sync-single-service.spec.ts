import { NotFoundException } from '@nestjs/common';
import { Service } from 'src/entities';
import { syncSingleService } from './sync-single-service';

describe('syncSingleService', () => {
  const makeServiceDeps = () => {
    const serviceRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    const appInstanceRepository = {
      findOne: jest.fn(),
    };

    const syncHistoryRepository = {
      save: jest.fn(),
    };

    const clusterAdapterFactory = {
      createAdapter: jest.fn(),
    };

    const logger = {
      log: jest.fn(),
      debug: jest.fn(),
      error: jest.fn(),
    };

    const service = {
      serviceRepository,
      appInstanceRepository,
      syncHistoryRepository,
      clusterAdapterFactory,
      logger,
    } as any;

    return {
      service,
      serviceRepository,
      appInstanceRepository,
      syncHistoryRepository,
      clusterAdapterFactory,
      logger,
    };
  };

  const sourceAppInstance = {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'source-app',
    cluster: 'source-cluster',
    namespace: 'source-ns',
    clusterType: 'rancher',
    environment: { name: 'dev' },
  };

  const targetAppInstance = {
    id: '22222222-2222-4222-8222-222222222222',
    name: 'target-app',
    cluster: 'target-cluster',
    namespace: 'target-ns',
    clusterType: 'generic',
    environment: { name: 'prod' },
  };

  it('syncs a service by UUID and writes success history', async () => {
    const {
      service,
      serviceRepository,
      appInstanceRepository,
      syncHistoryRepository,
      clusterAdapterFactory,
    } = makeServiceDeps();

    const sourceService = {
      id: '33333333-3333-4333-8333-333333333333',
      name: 'api',
      appInstanceId: sourceAppInstance.id,
      imageTag: 'repo/api:v2',
      workloadType: 'deployments',
      status: 'active',
      replicas: 2,
      availableReplicas: 2,
      appInstance: sourceAppInstance,
    };

    const existingTargetService = {
      id: '44444444-4444-4444-8444-444444444444',
      name: 'api',
      appInstanceId: targetAppInstance.id,
      imageTag: 'repo/api:v1',
      workloadType: 'deployment',
      status: 'active',
    };

    const adapter = {
      updateWorkloadImage: jest.fn().mockResolvedValue({ ok: true }),
    };

    serviceRepository.findOne
      .mockResolvedValueOnce(sourceService)
      .mockResolvedValueOnce(existingTargetService);
    appInstanceRepository.findOne.mockResolvedValue(targetAppInstance);
    clusterAdapterFactory.createAdapter.mockResolvedValue(adapter);
    serviceRepository.save.mockResolvedValue(existingTargetService);
    syncHistoryRepository.save.mockResolvedValue({});

    const result = await syncSingleService(
      service,
      sourceService.id,
      targetAppInstance.id,
      'sync-op-1',
      'tester',
    );

    expect(adapter.updateWorkloadImage).toHaveBeenCalledWith(
      targetAppInstance.cluster,
      targetAppInstance.namespace,
      sourceService.name,
      'deployment',
      sourceService.imageTag,
    );
    expect(serviceRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        imageTag: sourceService.imageTag,
        workloadType: 'deployment',
        status: 'synced',
      }),
    );
    expect(syncHistoryRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        syncOperationId: 'sync-op-1',
        serviceId: sourceService.id,
        serviceName: 'api',
        status: 'success',
        initiatedBy: 'tester',
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        serviceId: sourceService.id,
        targetAppInstanceId: targetAppInstance.id,
        previousImageTag: 'repo/api:v1',
        newImageTag: 'repo/api:v2',
        status: 'success',
      }),
    );
  });

  it('falls back to synthetic ID lookup and creates target service when missing', async () => {
    const {
      service,
      serviceRepository,
      appInstanceRepository,
      syncHistoryRepository,
      clusterAdapterFactory,
    } = makeServiceDeps();

    const syntheticId = `${sourceAppInstance.id}-api`;

    const sourceAdapter = {
      getDeployments: jest.fn().mockResolvedValue([
        {
          name: 'api',
          image: 'repo/api:v3',
          type: 'deployment',
          state: 'active',
          scale: 1,
          availableReplicas: 1,
        },
      ]),
    };

    const targetAdapter = {
      updateWorkloadImage: jest.fn().mockResolvedValue({ ok: true }),
    };

    serviceRepository.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    appInstanceRepository.findOne
      .mockResolvedValueOnce(sourceAppInstance)
      .mockResolvedValueOnce(targetAppInstance);

    clusterAdapterFactory.createAdapter
      .mockResolvedValueOnce(sourceAdapter)
      .mockResolvedValueOnce(targetAdapter);

    serviceRepository.create.mockImplementation((input) => ({ ...input }));
    serviceRepository.save.mockResolvedValue({ id: 'new-id' });
    syncHistoryRepository.save.mockResolvedValue({});

    const result = await syncSingleService(
      service,
      syntheticId,
      targetAppInstance.id,
      'sync-op-2',
      'tester',
    );

    expect(sourceAdapter.getDeployments).toHaveBeenCalledWith(
      sourceAppInstance.cluster,
      sourceAppInstance.namespace,
    );
    expect(targetAdapter.updateWorkloadImage).toHaveBeenCalledWith(
      targetAppInstance.cluster,
      targetAppInstance.namespace,
      'api',
      'deployment',
      'repo/api:v3',
    );
    expect(serviceRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'api',
        appInstanceId: targetAppInstance.id,
        imageTag: 'repo/api:v3',
        status: 'synced',
      }),
    );
    expect(result.status).toBe('success');
  });

  it('throws NotFoundException when source service cannot be resolved', async () => {
    const { service, serviceRepository } = makeServiceDeps();

    serviceRepository.findOne.mockResolvedValue(null);

    await expect(
      syncSingleService(
        service,
        'non-uuid-short-id',
        targetAppInstance.id,
        'sync-op-3',
        'tester',
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws NotFoundException when target app instance does not exist', async () => {
    const { service, serviceRepository, appInstanceRepository } = makeServiceDeps();

    serviceRepository.findOne.mockResolvedValueOnce({
      id: '33333333-3333-4333-8333-333333333333',
      name: 'api',
      appInstanceId: sourceAppInstance.id,
      imageTag: 'repo/api:v2',
      workloadType: 'deployment',
      appInstance: sourceAppInstance,
    });

    appInstanceRepository.findOne.mockResolvedValue(null);

    await expect(
      syncSingleService(
        service,
        '33333333-3333-4333-8333-333333333333',
        targetAppInstance.id,
        'sync-op-4',
        'tester',
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('wraps adapter update errors with cluster API context', async () => {
    const {
      service,
      serviceRepository,
      appInstanceRepository,
      clusterAdapterFactory,
    } = makeServiceDeps();

    serviceRepository.findOne
      .mockResolvedValueOnce({
        id: '33333333-3333-4333-8333-333333333333',
        name: 'api',
        appInstanceId: sourceAppInstance.id,
        imageTag: 'repo/api:v2',
        workloadType: 'deployment',
        appInstance: sourceAppInstance,
      })
      .mockResolvedValueOnce(null);

    appInstanceRepository.findOne.mockResolvedValue(targetAppInstance);

    clusterAdapterFactory.createAdapter.mockResolvedValue({
      updateWorkloadImage: jest.fn().mockRejectedValue(new Error('boom')),
    });

    await expect(
      syncSingleService(
        service,
        '33333333-3333-4333-8333-333333333333',
        targetAppInstance.id,
        'sync-op-5',
        'tester',
      ),
    ).rejects.toThrow('Cluster API update failed: boom');
  });
});
