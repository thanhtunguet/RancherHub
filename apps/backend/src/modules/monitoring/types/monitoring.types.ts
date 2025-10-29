import { MonitoredInstance } from '../../../entities/monitored-instance.entity';
import { MonitoringConfig } from '../../../entities/monitoring-config.entity';

export type HealthStatus = 'healthy' | 'warning' | 'critical' | 'error' | 'paused';

export type NotificationSchedule = 'daily' | 'hourly' | 'immediate';

export interface WorkloadDetails {
  name: string;
  type: string;
  status: 'healthy' | 'failed' | 'paused';
  state: string;
  scale: number;
  availableReplicas: number;
  image: string;
}

export interface RancherWorkload {
  name?: string;
  type?: string;
  state: string;
  scale?: number;
  availableReplicas?: number;
  image?: string;
}

export interface HealthCheckDetails {
  workloads: WorkloadDetails[];
  cluster: string;
  namespace: string;
  checkTime: string;
}

export interface HealthCheckResult {
  monitoredInstanceId: string;
  appInstance: {
    name: string;
    cluster: string;
    namespace: string;
    environment: {
      name: string;
    };
  };
  status: HealthStatus;
  responseTimeMs: number;
  servicesCount: number;
  healthyServices: number;
  failedServices: number;
  pausedServices: number;
  details: HealthCheckDetails;
  error?: string;
}

export interface TelegramTestConfig {
  telegramBotToken: string;
  telegramChatId: string;
  proxyHost?: string;
  proxyPort?: number;
  proxyUsername?: string;
  proxyPassword?: string;
  taggedUsers?: string[];
}

export interface CriticalAlert {
  appInstanceName: string;
  environmentName: string;
  serviceName?: string;
  status: string;
  details?: string;
  failedServices?: WorkloadDetails[];
}

export interface MonitoringHistoryCreateDto {
  monitoredInstanceId: string;
  status: HealthStatus;
  responseTimeMs: number;
  servicesCount?: number;
  healthyServices?: number;
  failedServices?: number;
  details?: string;
  error?: string;
}

export interface AlertCreateDto {
  monitoredInstanceId: string;
  alertType: string;
  severity: 'warning' | 'critical';
  message: string;
}

export interface EnvironmentGroupedResults {
  [environmentName: string]: HealthCheckResult[];
}