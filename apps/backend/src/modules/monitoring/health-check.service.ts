import { Injectable, Logger } from '@nestjs/common';
import { MonitoredInstance } from '../../entities/monitored-instance.entity';
import { RancherApiService } from '../../services/rancher-api.service';
import { MonitoringService } from './monitoring.service';
import {
  HealthCheckResult,
  WorkloadDetails,
  HealthStatus,
  RancherWorkload,
} from './types/monitoring.types';

@Injectable()
export class HealthCheckService {
  private readonly logger = new Logger(HealthCheckService.name);

  constructor(
    private readonly rancherApiService: RancherApiService,
    private readonly monitoringService: MonitoringService,
  ) {}

  async checkAllInstances(instances: MonitoredInstance[]): Promise<HealthCheckResult[]> {
    this.logger.log(`Starting health check for ${instances.length} instances`);
    
    const results: HealthCheckResult[] = [];
    
    for (const instance of instances) {
      if (!instance.monitoringEnabled) {
        this.logger.log(`Skipping disabled instance: ${instance.appInstance?.name}`);
        continue;
      }

      try {
        const result = await this.checkInstance(instance);
        results.push(result);
      } catch (error) {
        this.logger.error(`Failed to check instance ${instance.appInstance?.name}: ${error.message}`);
        results.push({
          monitoredInstanceId: instance.id,
          appInstance: instance.appInstance,
          status: 'error',
          responseTimeMs: 0,
          servicesCount: 0,
          healthyServices: 0,
          failedServices: 0,
          details: {
            workloads: [],
            cluster: instance.appInstance?.cluster || 'unknown',
            namespace: instance.appInstance?.namespace || 'unknown',
            checkTime: new Date().toISOString(),
          },
          error: error.message,
        });
      }
    }

    return results;
  }

  async checkInstance(instance: MonitoredInstance): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      this.logger.log(`Checking health for instance: ${instance.appInstance?.name}`);
      
      // Get workloads for this app instance using the same method as regular service loading
      const workloads = await this.rancherApiService.getDeploymentsFromK8sApi(
        instance.appInstance.rancherSite,
        instance.appInstance.cluster,
        instance.appInstance.namespace,
      );

      const responseTime = Date.now() - startTime;
      
      // Analyze workload health
      const workloadsCount = workloads.length;
      let healthyWorkloads = 0;
      let failedWorkloads = 0;
      const workloadDetails: WorkloadDetails[] = [];

      for (const workload of workloads) {
        const isHealthy = this.isWorkloadHealthy(workload);
        if (isHealthy) {
          healthyWorkloads++;
        } else {
          failedWorkloads++;
        }

        workloadDetails.push({
          name: workload.name || 'unknown',
          type: workload.type || 'unknown',
          status: isHealthy ? 'healthy' : 'failed',
          state: workload.state,
          scale: workload.scale,
          availableReplicas: workload.availableReplicas,
          image: workload.image,
        });
      }

      // Determine overall status
      let status: HealthStatus = 'healthy';
      
      if (failedWorkloads > 0) {
        if (failedWorkloads >= workloadsCount * 0.5) {
          status = 'critical'; // More than 50% failed
        } else {
          status = 'warning'; // Some workloads failed
        }
      }

      const result: HealthCheckResult = {
        monitoredInstanceId: instance.id,
        appInstance: instance.appInstance,
        status,
        responseTimeMs: responseTime,
        servicesCount: workloadsCount,
        healthyServices: healthyWorkloads,
        failedServices: failedWorkloads,
        details: {
          workloads: workloadDetails,
          cluster: instance.appInstance.cluster,
          namespace: instance.appInstance.namespace,
          checkTime: new Date().toISOString(),
        },
      };

      // Save to monitoring history
      await this.monitoringService.createMonitoringHistory({
        monitoredInstanceId: instance.id,
        status,
        responseTimeMs: responseTime,
        servicesCount: workloadsCount,
        healthyServices: healthyWorkloads,
        failedServices: failedWorkloads,
        details: JSON.stringify(result.details),
      });

      // Update instance status
      const consecutiveFailures = status === 'healthy' ? 0 : instance.consecutiveFailures + 1;
      await this.monitoringService.updateMonitoredInstanceStatus(
        instance.id,
        status,
        consecutiveFailures,
      );

      // Check if we need to generate an alert
      if (consecutiveFailures >= 3 && !instance.alertSent) {
        await this.generateAlert(instance, result);
      }

      this.logger.log(`Health check completed for ${instance.appInstance?.name}: ${status}`);
      return result;
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      this.logger.error(`Health check failed for ${instance.appInstance?.name}: ${error.message}`);
      
      // Save error to monitoring history
      await this.monitoringService.createMonitoringHistory({
        monitoredInstanceId: instance.id,
        status: 'error',
        responseTimeMs: responseTime,
        error: error.message,
      });

      // Update instance status with failure
      const consecutiveFailures = instance.consecutiveFailures + 1;
      await this.monitoringService.updateMonitoredInstanceStatus(
        instance.id,
        'error',
        consecutiveFailures,
      );

      throw error;
    }
  }

  private isWorkloadHealthy(workload: RancherWorkload): boolean {
    // Check workload state first
    if (workload.state === 'active') {
      return workload.availableReplicas >= workload.scale;
    }
    
    // Check different workload types
    switch (workload.type?.toLowerCase()) {
      case 'deployment':
        return workload.state === 'active' && workload.availableReplicas >= workload.scale;
      case 'statefulset':
        return workload.state === 'active' && workload.availableReplicas >= workload.scale;
      case 'daemonset':
        return workload.state === 'active' && workload.availableReplicas > 0;
      default:
        // For unknown types, consider healthy if state is active and has replicas
        return workload.state === 'active' && (workload.availableReplicas || 0) > 0;
    }
  }


  private async generateAlert(instance: MonitoredInstance, result: HealthCheckResult): Promise<void> {
    try {
      const alertType = result.failedServices > 0 ? 'service_failure' : 'performance_degradation';
      const severity = result.status === 'critical' ? 'critical' : 'warning';
      
      let message = `Health check failed for ${instance.appInstance?.name} in ${instance.appInstance?.environment?.name}`;
      
      if (result.failedServices > 0) {
        message += `. ${result.failedServices}/${result.servicesCount} workloads are failing.`;
      }
      
      if (result.error) {
        message += ` Error: ${result.error}`;
      }

      await this.monitoringService.createAlert({
        monitoredInstanceId: instance.id,
        alertType,
        severity,
        message,
      });

      this.logger.log(`Alert generated for ${instance.appInstance?.name}`);
    } catch (error) {
      this.logger.error(`Failed to generate alert: ${error.message}`);
    }
  }
}