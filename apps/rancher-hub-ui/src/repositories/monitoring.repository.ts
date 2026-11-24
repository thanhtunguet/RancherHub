import { getApiClient } from '../api/client';
import type {
  CreateMonitoringConfigDto, UpdateMonitoringConfigDto, TestTelegramConnectionDto,
  MonitoringConfig, MonitoredInstance, CreateMonitoredInstanceDto, UpdateMonitoredInstanceDto,
  MonitoringAlert
} from '../api/types';

export const MonitoringRepository = {
  getConfig: () =>
    getApiClient().get<MonitoringConfig>('/api/monitoring/config').then(r => r.data),

  createOrUpdateConfig: (dto: CreateMonitoringConfigDto) =>
    getApiClient().post('/api/monitoring/config', dto).then(r => r.data),

  updateConfig: (dto: UpdateMonitoringConfigDto) =>
    getApiClient().put('/api/monitoring/config', dto).then(r => r.data),

  testTelegram: (dto: TestTelegramConnectionDto) =>
    getApiClient().post('/api/monitoring/config/test-telegram', dto).then(r => r.data),

  getInstances: () =>
    getApiClient().get<MonitoredInstance[]>('/api/monitoring/instances').then(r => r.data),

  getInstance: (id: string) =>
    getApiClient().get<MonitoredInstance>(`/api/monitoring/instances/${id}`).then(r => r.data),

  createInstance: (dto: CreateMonitoredInstanceDto) =>
    getApiClient().post('/api/monitoring/instances', dto).then(r => r.data),

  updateInstance: (id: string, dto: UpdateMonitoredInstanceDto) =>
    getApiClient().put(`/api/monitoring/instances/${id}`, dto).then(r => r.data),

  deleteInstance: (id: string) =>
    getApiClient().delete(`/api/monitoring/instances/${id}`).then(r => r.data),

  getHistory: (instanceId?: string, days?: number) =>
    getApiClient().get('/api/monitoring/history', { params: { instanceId, days } }).then(r => r.data),

  getAlerts: (instanceId?: string, resolved?: boolean) =>
    getApiClient().get<MonitoringAlert[]>('/api/monitoring/alerts', { params: { instanceId, resolved } }).then(r => r.data),

  resolveAlert: (id: string) =>
    getApiClient().put(`/api/monitoring/alerts/${id}/resolve`).then(r => r.data),

  triggerDailyCheck: () =>
    getApiClient().post('/api/monitoring/trigger/daily-check', {}).then(r => r.data),

  triggerHourlyCheck: () =>
    getApiClient().post('/api/monitoring/trigger/hourly-check', {}).then(r => r.data),

  test: () =>
    getApiClient().get('/api/monitoring/test').then(r => r.data),
};
