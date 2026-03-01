import { MonitoringCronService } from './cron.service';

describe('MonitoringCronService', () => {
  const makeDeps = () => {
    const monitoringService = {
      getConfig: jest.fn(),
      getActiveMonitoredInstances: jest.fn(),
      getAlertHistory: jest.fn(),
    };

    const healthCheckService = {
      checkAllInstances: jest.fn(),
      checkInstance: jest.fn(),
    };

    const telegramService = {
      sendHealthCheckSummaryWithVisual: jest.fn(),
      sendCriticalAlertWithVisual: jest.fn(),
    };

    const service = new MonitoringCronService(
      monitoringService as any,
      healthCheckService as any,
      telegramService as any,
    );

    return {
      service,
      monitoringService,
      healthCheckService,
      telegramService,
    };
  };

  const config = {
    monitoringEnabled: true,
    notificationSchedule: 'immediate',
    telegramBotToken: 'bot-token',
    telegramChatId: 'chat-id',
  } as any;

  const instance = {
    id: 'mon-1',
    checkIntervalMinutes: 60,
    lastCheckTime: null,
    appInstance: {
      id: 'app-1',
      name: 'api',
      environment: { name: 'dev' },
    },
  } as any;

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('skips daily check when monitoring is disabled', async () => {
    const { service, monitoringService, healthCheckService } = makeDeps();

    monitoringService.getConfig.mockResolvedValue({ monitoringEnabled: false });

    await service.runDailyHealthCheck();

    expect(healthCheckService.checkAllInstances).not.toHaveBeenCalled();
  });

  it('runs daily check, sends summary, and sends critical alert when immediate', async () => {
    const { service, monitoringService, healthCheckService, telegramService } =
      makeDeps();

    monitoringService.getConfig.mockResolvedValue(config);
    monitoringService.getActiveMonitoredInstances.mockResolvedValue([instance]);
    healthCheckService.checkAllInstances.mockResolvedValue([
      {
        monitoredInstanceId: instance.id,
        appInstance: instance.appInstance,
        status: 'critical',
        error: undefined,
        failedServices: 1,
        servicesCount: 1,
        details: {
          workloads: [{ name: 'api', status: 'failed' }],
        },
      },
    ]);
    monitoringService.getAlertHistory.mockResolvedValue([]);

    await service.runDailyHealthCheck();

    expect(healthCheckService.checkAllInstances).toHaveBeenCalledWith([instance]);
    expect(telegramService.sendHealthCheckSummaryWithVisual).toHaveBeenCalledWith(
      config.telegramChatId,
      expect.any(Array),
      config,
    );
    expect(telegramService.sendCriticalAlertWithVisual).toHaveBeenCalledWith(
      config.telegramChatId,
      expect.objectContaining({
        appInstanceName: instance.appInstance.name,
        status: 'critical',
      }),
      config,
    );
  });

  it('swallows telegram summary errors in daily check', async () => {
    const { service, monitoringService, healthCheckService, telegramService } =
      makeDeps();

    monitoringService.getConfig.mockResolvedValue(config);
    monitoringService.getActiveMonitoredInstances.mockResolvedValue([instance]);
    healthCheckService.checkAllInstances.mockResolvedValue([
      {
        monitoredInstanceId: instance.id,
        appInstance: instance.appInstance,
        status: 'healthy',
        failedServices: 0,
        servicesCount: 1,
        details: { workloads: [] },
      },
    ]);
    telegramService.sendHealthCheckSummaryWithVisual.mockRejectedValue(
      new Error('telegram-down'),
    );

    await expect(service.runDailyHealthCheck()).resolves.toBeUndefined();
  });

  it('runs hourly checks only for due instances and sends immediate critical alerts', async () => {
    const { service, monitoringService, healthCheckService, telegramService } =
      makeDeps();

    const now = new Date();
    const due = { ...instance, checkIntervalMinutes: 60, lastCheckTime: null };
    const notDue = {
      ...instance,
      id: 'mon-2',
      checkIntervalMinutes: 60,
      lastCheckTime: new Date(now.getTime() - 5 * 60 * 1000),
    };

    monitoringService.getConfig.mockResolvedValue(config);
    monitoringService.getActiveMonitoredInstances.mockResolvedValue([due, notDue]);
    healthCheckService.checkInstance.mockResolvedValue({
      monitoredInstanceId: due.id,
      appInstance: due.appInstance,
      status: 'critical',
      failedServices: 1,
      servicesCount: 1,
      details: { workloads: [{ name: 'api', status: 'failed' }] },
    });
    monitoringService.getAlertHistory.mockResolvedValue([]);

    await service.runHourlyChecks();

    expect(healthCheckService.checkInstance).toHaveBeenCalledTimes(1);
    expect(healthCheckService.checkInstance).toHaveBeenCalledWith(due);
    expect(telegramService.sendCriticalAlertWithVisual).toHaveBeenCalledTimes(1);
  });

  it('runs frequent checks only for <=3 minute intervals and warns/critical with failures', async () => {
    const { service, monitoringService, healthCheckService, telegramService } =
      makeDeps();

    const frequent = {
      ...instance,
      id: 'mon-fast',
      checkIntervalMinutes: 3,
      lastCheckTime: null,
    };
    const slow = {
      ...instance,
      id: 'mon-slow',
      checkIntervalMinutes: 10,
      lastCheckTime: null,
    };

    monitoringService.getConfig.mockResolvedValue(config);
    monitoringService.getActiveMonitoredInstances.mockResolvedValue([
      frequent,
      slow,
    ]);
    healthCheckService.checkInstance.mockResolvedValue({
      monitoredInstanceId: frequent.id,
      appInstance: frequent.appInstance,
      status: 'warning',
      failedServices: 1,
      servicesCount: 2,
      details: { workloads: [{ name: 'api', status: 'failed' }] },
    });
    monitoringService.getAlertHistory.mockResolvedValue([]);

    await service.runFrequentChecks();

    expect(healthCheckService.checkInstance).toHaveBeenCalledTimes(1);
    expect(healthCheckService.checkInstance).toHaveBeenCalledWith(frequent);
    expect(telegramService.sendCriticalAlertWithVisual).toHaveBeenCalledTimes(1);
  });

  it('manual triggers delegate to cron methods', async () => {
    const { service } = makeDeps();

    const dailySpy = jest
      .spyOn(service, 'runDailyHealthCheck')
      .mockResolvedValue(undefined);
    const hourlySpy = jest
      .spyOn(service, 'runHourlyChecks')
      .mockResolvedValue(undefined);

    await service.triggerDailyCheck();
    await service.triggerHourlyCheck();

    expect(dailySpy).toHaveBeenCalledTimes(1);
    expect(hourlySpy).toHaveBeenCalledTimes(1);
  });
});
