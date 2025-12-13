import { Injectable, Logger } from '@nestjs/common';
import { HealthCheckResult, WorkloadDetails } from './types/monitoring.types';

@Injectable()
export class VisualStatusService {
  private readonly logger = new Logger(VisualStatusService.name);

  generateHealthCheckVisualSummary(results: HealthCheckResult[]): string {
    try {
      this.logger.debug(
        `Generating visual health check summary for ${results.length} instances`,
      );

      const totalInstances = results.length;
      const healthyInstances = results.filter(
        (r) => r.status === 'healthy',
      ).length;
      const warningInstances = results.filter(
        (r) => r.status === 'warning',
      ).length;
      const criticalInstances = results.filter(
        (r) => r.status === 'critical' || r.status === 'error',
      ).length;
      const pausedInstances = results.filter(
        (r) => r.status === 'paused',
      ).length;

      // Calculate total service counts across all instances
      const totalServices = results.reduce(
        (sum, r) => sum + (r.servicesCount || 0),
        0,
      );
      const healthyServices = results.reduce(
        (sum, r) => sum + (r.healthyServices || 0),
        0,
      );
      const warningServices = results.reduce(
        (sum, r) => sum + (r.failedServices || 0),
        0,
      );
      const pausedServices = results.reduce(
        (sum, r) => sum + (r.pausedServices || 0),
        0,
      );

      let visual = `\n`;

      // Compact status bar - max 20 chars wide
      const barLength = 20;
      const totalActiveServices = totalServices - pausedServices; // Only count active services for the bar
      const healthyBars =
        totalActiveServices > 0
          ? Math.round((healthyServices / totalActiveServices) * barLength)
          : 0;
      const warningBars =
        totalActiveServices > 0
          ? Math.round((warningServices / totalActiveServices) * barLength)
          : 0;
      const pausedBars =
        totalServices > 0
          ? Math.round((pausedServices / totalServices) * barLength)
          : 0;

      visual += `📊 `;
      visual += '🟢'.repeat(healthyBars);
      visual += '🟡'.repeat(warningBars);
      visual += '⏸️'.repeat(pausedBars);
      visual += '\n';

      // Compact stats - include paused count
      visual += `📈 ${totalServices}T | ${healthyServices}H | ${warningServices}W | ${pausedServices}P\n\n`;

      // Environment breakdown - more compact
      const byEnvironment = this.groupByEnvironment(results);

      Object.entries(byEnvironment).forEach(([envName, instances]) => {
        visual += `🌍 **${envName}**\n`;

        instances.slice(0, 4).forEach((instance) => {
          const statusIcon = this.getStatusEmoji(instance.status);
          const instanceName = instance.appInstance?.name || 'Unknown';
          const shortName =
            instanceName.length > 15
              ? instanceName.substring(0, 12) + '...'
              : instanceName;

          // Show service breakdown: healthy/warning/paused
          let serviceInfo = '';
          if (instance.servicesCount > 0) {
            const parts = [];
            if (instance.healthyServices > 0)
              parts.push(`${instance.healthyServices}H`);
            if (instance.failedServices > 0)
              parts.push(`${instance.failedServices}W`);
            if (instance.pausedServices > 0)
              parts.push(`${instance.pausedServices}P`);
            serviceInfo = ` ${parts.join('/')}`;
          }

          visual += `${statusIcon} ${shortName}${serviceInfo}\n`;

          // Show failed and paused services details
          if (instance.details?.workloads) {
            const failedWorkloads = instance.details.workloads.filter(
              (w) => w.status === 'failed',
            );
            const pausedWorkloads = instance.details.workloads.filter(
              (w) => w.status === 'paused',
            );

            // Show critical failed services
            if (failedWorkloads.length > 0 && instance.status === 'critical') {
              const failedName =
                failedWorkloads[0].name.length > 12
                  ? failedWorkloads[0].name.substring(0, 9) + '...'
                  : failedWorkloads[0].name;
              visual += `  ❌ ${failedName}`;
              if (failedWorkloads.length > 1) {
                visual += ` +${failedWorkloads.length - 1}`;
              }
              visual += '\n';
            }

            // Show paused services if any
            if (pausedWorkloads.length > 0) {
              const pausedName =
                pausedWorkloads[0].name.length > 12
                  ? pausedWorkloads[0].name.substring(0, 9) + '...'
                  : pausedWorkloads[0].name;
              visual += `  ⏸️ ${pausedName}`;
              if (pausedWorkloads.length > 1) {
                visual += ` +${pausedWorkloads.length - 1}`;
              }
              visual += '\n';
            }
          }
        });

        if (instances.length > 4) {
          visual += `  ... +${instances.length - 4} more\n`;
        }
        visual += `\n`;
      });

      return visual;
    } catch (error) {
      this.logger.error(
        `Failed to generate visual health check summary: ${error.message}`,
      );
      return 'Failed to generate visual summary';
    }
  }

  generateCriticalAlertVisual(alertData: {
    appInstanceName: string;
    environmentName: string;
    status: string;
    details?: string;
    failedServices?: WorkloadDetails[];
  }): string {
    try {
      this.logger.debug(
        `Generating critical alert visual for ${alertData.appInstanceName}`,
      );

      let visual = `\n`;
      visual += `🚨🚨🚨 CRITICAL ALERT 🚨🚨🚨\n\n`;

      // Compact alert info
      visual += `🔥 **${alertData.environmentName}**\n`;
      visual += `📱 ${alertData.appInstanceName}\n`;
      visual += `⚠️ Status: ${alertData.status.toUpperCase()}\n\n`;

      // Failed services - compact list
      if (alertData.failedServices && alertData.failedServices.length > 0) {
        visual += `💥 **Failed Services:**\n`;

        alertData.failedServices.slice(0, 3).forEach((service) => {
          const serviceName =
            service.name.length > 20
              ? service.name.substring(0, 17) + '...'
              : service.name;
          visual += `❌ ${serviceName}\n`;
        });

        if (alertData.failedServices.length > 3) {
          visual += `... +${alertData.failedServices.length - 3} more\n`;
        }
        visual += `\n`;
      }

      // Compact action items
      visual += `⚡ **Actions:**\n`;
      visual += `1️⃣ Check logs\n`;
      visual += `2️⃣ Restart services\n`;
      visual += `3️⃣ Call DevOps\n\n`;

      return visual;
    } catch (error) {
      this.logger.error(
        `Failed to generate critical alert visual: ${error.message}`,
      );
      return 'Failed to generate alert visual';
    }
  }

  private groupByEnvironment(
    results: HealthCheckResult[],
  ): Record<string, HealthCheckResult[]> {
    return results.reduce(
      (acc, result) => {
        const envName = result.appInstance?.environment?.name || 'Unknown';
        if (!acc[envName]) acc[envName] = [];
        acc[envName].push(result);
        return acc;
      },
      {} as Record<string, HealthCheckResult[]>,
    );
  }

  private getStatusEmoji(status: string): string {
    switch (status) {
      case 'healthy':
        return '✅';
      case 'warning':
        return '⚠️';
      case 'critical':
      case 'error':
        return '🔴';
      case 'paused':
        return '⏸️';
      default:
        return '❓';
    }
  }
}
