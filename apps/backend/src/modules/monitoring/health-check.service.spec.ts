import { HealthCheckService } from './health-check.service';

describe('HealthCheckService', () => {
  const makeDeps = () => {
    const rancherApiService = {
      getDeploymentsFromK8sApi: jest.fn(),
    };

    const monitoringService = {
      createMonitoringHistory: jest.fn(),
      updateMonitoredInstanceStatus: jest.fn(),
      createAlert: jest.fn(),
    };

    const service = new HealthCheckService(
      rancherApiService as any,
      monitoringService as any,
    );

    return {
      service,
      rancherApiService,
      monitoringService,
    };
  };

  const rancherInstance = {
    id: 'mon-1',
    monitoringEnabled: true,
    consecutiveFailures: 0,
    alertSent: false,
    appInstance: {
      id: 'app-1',
      name: 'api',
      clusterType: 'rancher',
      cluster: 'c-1',
      namespace: 'ns-1',
      environment: { name: 'dev' },
      rancherSite: { id: 'rs-1' },
      genericClusterSite: null,
    },
  } as any;

  const disabledInstance = {
    ...rancherInstance,
    id: 'mon-disabled',
    monitoringEnabled: false,
  } as any;

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('skips disabled instances in checkAllInstances', async () => {
    const { service } = makeDeps();

    const checkSpy = jest
      .spyOn(service, 'checkInstance')
      .mockResolvedValue({ status: 'healthy' } as any);

    const result = await service.checkAllInstances([disabledInstance]);

    expect(checkSpy).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  it('returns error result in checkAllInstances when checkInstance throws', async () => {
    const { service } = makeDeps();

    jest
      .spyOn(service, 'checkInstance')
      .mockRejectedValue(new Error('health-failed'));

    const result = await service.checkAllInstances([rancherInstance]);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(
      expect.objectContaining({
        monitoredInstanceId: rancherInstance.id,
        status: 'error',
        error: 'health-failed',
      }),
    );
  });

  it('classifies healthy workloads and stores history', async () => {
    const { service, rancherApiService, monitoringService } = makeDeps();

    rancherApiService.getDeploymentsFromK8sApi.mockResolvedValue([
      {
        name: 'api',
        type: 'deployment',
        state: 'active',
        scale: 2,
        availableReplicas: 2,
        image: 'repo/api:v1',
      },
    ]);

    const result = await service.checkInstance(rancherInstance);

    expect(result.status).toBe('healthy');
    expect(result.failedServices).toBe(0);
    expect(result.healthyServices).toBe(1);
    expect(monitoringService.createMonitoringHistory).toHaveBeenCalledWith(
      expect.objectContaining({
        monitoredInstanceId: rancherInstance.id,
        status: 'healthy',
      }),
    );
    expect(monitoringService.updateMonitoredInstanceStatus).toHaveBeenCalledWith(
      rancherInstance.id,
      'healthy',
      0,
    );
  });

  it('classifies warning when some workloads fail and updates failure count', async () => {
    const { service, rancherApiService, monitoringService } = makeDeps();

    const instance = {
      ...rancherInstance,
      consecutiveFailures: 1,
    };

    rancherApiService.getDeploymentsFromK8sApi.mockResolvedValue([
      {
        name: 'ok',
        type: 'deployment',
        state: 'active',
        scale: 1,
        availableReplicas: 1,
      },
      {
        name: 'bad',
        type: 'deployment',
        state: 'inactive',
        scale: 1,
        availableReplicas: 0,
      },
      {
        name: 'paused',
        type: 'deployment',
        state: 'active',
        scale: 0,
        availableReplicas: 0,
      },
    ]);

    const result = await service.checkInstance(instance as any);

    expect(result.status).toBe('warning');
    expect(result.failedServices).toBe(1);
    expect(result.pausedServices).toBe(1);
    expect(monitoringService.updateMonitoredInstanceStatus).toHaveBeenCalledWith(
      instance.id,
      'warning',
      2,
    );
  });

  it('classifies critical when at least half workloads fail', async () => {
    const { service, rancherApiService } = makeDeps();

    rancherApiService.getDeploymentsFromK8sApi.mockResolvedValue([
      {
        name: 'bad-1',
        type: 'deployment',
        state: 'inactive',
        scale: 1,
        availableReplicas: 0,
      },
      {
        name: 'bad-2',
        type: 'deployment',
        state: 'inactive',
        scale: 1,
        availableReplicas: 0,
      },
      {
        name: 'ok',
        type: 'deployment',
        state: 'active',
        scale: 1,
        availableReplicas: 1,
      },
    ]);

    const result = await service.checkInstance(rancherInstance);

    expect(result.status).toBe('critical');
    expect(result.failedServices).toBe(2);
  });

  it('generates alert when failures reach threshold and alert not sent', async () => {
    const { service, rancherApiService, monitoringService } = makeDeps();

    const instance = {
      ...rancherInstance,
      consecutiveFailures: 2,
      alertSent: false,
    };

    rancherApiService.getDeploymentsFromK8sApi.mockResolvedValue([
      {
        name: 'bad',
        type: 'deployment',
        state: 'inactive',
        scale: 1,
        availableReplicas: 0,
      },
    ]);

    await service.checkInstance(instance as any);

    expect(monitoringService.createAlert).toHaveBeenCalledWith(
      expect.objectContaining({
        monitoredInstanceId: instance.id,
        severity: 'critical',
      }),
    );
  });

  it('records error history and rethrows when workload fetch fails', async () => {
    const { service, rancherApiService, monitoringService } = makeDeps();

    rancherApiService.getDeploymentsFromK8sApi.mockRejectedValue(
      new Error('rancher-down'),
    );

    await expect(service.checkInstance(rancherInstance)).rejects.toThrow(
      'rancher-down',
    );

    expect(monitoringService.createMonitoringHistory).toHaveBeenCalledWith(
      expect.objectContaining({
        monitoredInstanceId: rancherInstance.id,
        status: 'error',
        error: 'rancher-down',
      }),
    );
    expect(monitoringService.updateMonitoredInstanceStatus).toHaveBeenCalledWith(
      rancherInstance.id,
      'error',
      rancherInstance.consecutiveFailures + 1,
    );
  });
});
