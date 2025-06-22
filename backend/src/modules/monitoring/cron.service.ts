import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MonitoringService } from './monitoring.service';
import { HealthCheckService } from './health-check.service';
import { TelegramService } from './telegram.service';
import { MonitoredInstance } from '../../entities/monitored-instance.entity';
import { MonitoringConfig } from '../../entities/monitoring-config.entity';
import { HealthCheckResult } from './types/monitoring.types';

@Injectable()
export class MonitoringCronService {
  private readonly logger = new Logger(MonitoringCronService.name);

  constructor(
    private readonly monitoringService: MonitoringService,
    private readonly healthCheckService: HealthCheckService,
    private readonly telegramService: TelegramService,
  ) {}

  @Cron('0 23 * * *') // Every day at 11:00 PM
  async runDailyHealthCheck() {
    this.logger.log('Starting daily health check...');

    try {
      const config = await this.monitoringService.getConfig();
      if (!config?.monitoringEnabled) {
        this.logger.log('Monitoring is disabled, skipping health check');
        return;
      }

      const instances =
        await this.monitoringService.getActiveMonitoredInstances();
      if (instances.length === 0) {
        this.logger.log('No monitored instances found, skipping health check');
        return;
      }

      this.logger.log(
        `Checking health for ${instances.length} monitored instances`,
      );
      const results =
        await this.healthCheckService.checkAllInstances(instances);

      // Generate summary report
      const summary = this.telegramService.formatHealthCheckSummary(results);

      // Send Telegram notification if configured
      if (config.telegramBotToken && config.telegramChatId) {
        try {
          await this.telegramService.sendMessage(
            config.telegramChatId,
            summary,
            config,
          );
          this.logger.log('Daily health check summary sent to Telegram');
        } catch (error) {
          this.logger.error(
            `Failed to send Telegram notification: ${error.message}`,
          );
        }
      }

      // Check for critical alerts
      const criticalResults = results.filter((r) => r.status === 'critical');
      if (
        criticalResults.length > 0 &&
        config.notificationSchedule === 'immediate'
      ) {
        await this.sendCriticalAlerts(criticalResults, config);
      }

      this.logger.log(
        `Daily health check completed. ${results.length} instances checked.`,
      );
    } catch (error) {
      this.logger.error(`Daily health check failed: ${error.message}`);
    }
  }

  @Cron('0 * * * *') // Every hour
  async runHourlyChecks() {
    try {
      const config = await this.monitoringService.getConfig();
      if (!config?.monitoringEnabled) {
        return;
      }

      const instances =
        await this.monitoringService.getActiveMonitoredInstances();

      // Filter instances that need hourly checks
      const hourlyInstances = instances.filter(
        (instance) =>
          instance.checkIntervalMinutes <= 60 &&
          this.shouldCheckInstance(instance),
      );

      if (hourlyInstances.length === 0) {
        return;
      }

      this.logger.log(
        `Running hourly health checks for ${hourlyInstances.length} instances`,
      );

      for (const instance of hourlyInstances) {
        try {
          const result = await this.healthCheckService.checkInstance(instance);

          // Send immediate alerts for critical issues
          if (
            result.status === 'critical' &&
            config.notificationSchedule === 'immediate'
          ) {
            await this.sendCriticalAlert(result, config);
          }
        } catch (error) {
          this.logger.error(
            `Hourly check failed for instance ${instance.appInstance?.name}: ${error.message}`,
          );
        }
      }
    } catch (error) {
      this.logger.error(`Hourly health check failed: ${error.message}`);
    }
  }

  @Cron('*/3 * * * *') // Every 3 minutes - for critical service monitoring
  async runFrequentChecks() {
    try {
      const config = await this.monitoringService.getConfig();
      if (!config?.monitoringEnabled) {
        return;
      }

      const instances =
        await this.monitoringService.getActiveMonitoredInstances();

      // Only check instances with very frequent intervals (3 minutes or less)
      const frequentInstances = instances.filter(
        (instance) =>
          instance.checkIntervalMinutes <= 3 &&
          this.shouldCheckInstance(instance),
      );

      if (frequentInstances.length === 0) {
        return;
      }

      if (frequentInstances.length > 0) {
        this.logger.log(
          `Running 3-minute health checks for ${frequentInstances.length} instances`,
        );
      }

      for (const instance of frequentInstances) {
        try {
          const result = await this.healthCheckService.checkInstance(instance);

          // Send alerts only when there are service issues (critical or warning status)
          if (
            (result.status === 'critical' || result.status === 'warning') &&
            result.failedServices > 0
          ) {
            await this.sendCriticalAlert(result, config);
          }
        } catch (error) {
          this.logger.error(
            `3-minute health check failed for instance ${instance.appInstance?.name}: ${error.message}`,
          );
        }
      }
    } catch (error) {
      this.logger.error(`Frequent health check failed: ${error.message}`);
    }
  }

  private shouldCheckInstance(instance: MonitoredInstance): boolean {
    if (!instance.lastCheckTime) {
      return true; // Never checked before
    }

    const now = new Date();
    const lastCheck = new Date(instance.lastCheckTime);
    const intervalMs = instance.checkIntervalMinutes * 60 * 1000;

    return now.getTime() - lastCheck.getTime() >= intervalMs;
  }

  private async sendCriticalAlerts(
    results: HealthCheckResult[],
    config: MonitoringConfig,
  ): Promise<void> {
    for (const result of results) {
      await this.sendCriticalAlert(result, config);
    }
  }

  private async sendCriticalAlert(
    result: HealthCheckResult,
    config: MonitoringConfig,
  ): Promise<void> {
    try {
      if (!config.telegramBotToken || !config.telegramChatId) {
        return;
      }

      // Extract failed services from details
      const failedServices =
        result.details?.workloads?.filter((w) => w.status === 'failed') || [];

      const alertMessage = this.telegramService.formatCriticalAlert({
        appInstanceName: result.appInstance?.name || 'Unknown',
        environmentName: result.appInstance?.environment?.name || 'Unknown',
        status: result.status,
        details:
          result.error ||
          `${result.failedServices}/${result.servicesCount} services failed`,
        failedServices,
      });

      await this.telegramService.sendMessage(
        config.telegramChatId,
        alertMessage,
        config,
      );

      // Update the alert record with Telegram message ID
      const alerts = await this.monitoringService.getAlertHistory(
        result.monitoredInstanceId,
        false,
      );
      const latestAlert = alerts[0];

      if (latestAlert) {
        // Update alert with Telegram info (this would require extending the service)
        this.logger.log(
          `Critical alert sent to Telegram for ${result.appInstance?.name}`,
        );
      }
    } catch (error) {
      this.logger.error(`Failed to send critical alert: ${error.message}`);
    }
  }

  // Manual trigger methods for testing
  async triggerDailyCheck(): Promise<void> {
    this.logger.log('Manually triggering daily health check...');
    await this.runDailyHealthCheck();
  }

  async triggerHourlyCheck(): Promise<void> {
    this.logger.log('Manually triggering hourly health check...');
    await this.runHourlyChecks();
  }
}
