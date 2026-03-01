import { syncServices } from './sync-services';

describe('syncServices', () => {
  const makeServiceDeps = () => {
    const syncOperationRepository = {
      create: jest.fn(),
      save: jest.fn(),
    };

    const syncHistoryRepository = {
      save: jest.fn(),
    };

    const logger = {
      log: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    };

    const service = {
      syncOperationRepository,
      syncHistoryRepository,
      logger,
      syncSingleService: jest.fn(),
    } as any;

    return {
      service,
      syncOperationRepository,
      syncHistoryRepository,
      logger,
    };
  };

  const dto = {
    sourceEnvironmentId: 'env-source',
    targetEnvironmentId: 'env-target',
    serviceIds: ['svc-1', 'svc-2'],
    targetAppInstanceIds: ['app-1', 'app-2'],
  };

  it('marks operation completed when all syncs succeed', async () => {
    const { service, syncOperationRepository } = makeServiceDeps();

    const operation = {
      id: 'op-1',
      status: 'pending',
      startTime: new Date(),
      endTime: null,
    };

    syncOperationRepository.create.mockReturnValue(operation);
    syncOperationRepository.save.mockResolvedValue(operation);

    service.syncSingleService.mockImplementation(
      async (serviceId: string, targetAppInstanceId: string) => ({
        serviceId,
        targetAppInstanceId,
        status: 'success',
      }),
    );

    const result = await syncServices(service, dto as any, 'tester');

    expect(service.syncSingleService).toHaveBeenCalledTimes(4);
    expect(syncOperationRepository.save).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: 'completed' }),
    );
    expect(result.status).toBe('completed');
    expect(result.results).toHaveLength(4);
  });

  it('marks operation partial and writes failed history when some syncs fail', async () => {
    const { service, syncOperationRepository, syncHistoryRepository } =
      makeServiceDeps();

    const operation = {
      id: 'op-2',
      status: 'pending',
      startTime: new Date(),
      endTime: null,
    };

    syncOperationRepository.create.mockReturnValue(operation);
    syncOperationRepository.save.mockResolvedValue(operation);

    service.syncSingleService
      .mockResolvedValueOnce({ status: 'success' })
      .mockRejectedValueOnce(new Error('fail-1'))
      .mockResolvedValueOnce({ status: 'success' })
      .mockRejectedValueOnce(new Error('fail-2'));

    const result = await syncServices(service, dto as any, 'tester');

    expect(result.status).toBe('partial');
    expect(syncHistoryRepository.save).toHaveBeenCalledTimes(2);
    expect(syncHistoryRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        syncOperationId: 'op-2',
        status: 'failed',
        initiatedBy: 'tester',
      }),
    );
  });

  it('marks operation failed and rethrows when outer sync flow errors', async () => {
    const { service, syncOperationRepository } = makeServiceDeps();

    const operation = {
      id: 'op-3',
      status: 'pending',
      startTime: new Date(),
      endTime: null,
    };

    syncOperationRepository.create.mockReturnValue(operation);
    syncOperationRepository.save
      .mockResolvedValueOnce(operation)
      .mockRejectedValueOnce(new Error('db-down'));

    service.syncSingleService.mockResolvedValue({ status: 'success' });

    await expect(syncServices(service, dto as any, 'tester')).rejects.toThrow(
      'db-down',
    );

    expect(operation.status).toBe('failed');
    expect(syncOperationRepository.save).toHaveBeenCalledTimes(3);
  });
});
