import { getApiClient } from '../api/client';
import type { Service, ServiceWithImageSize, ImageTag, SyncServicesDto, CompareResult, AppInstanceTreeItem, SyncHistoryEntry } from '../api/types';

export const ServicesRepository = {
  getByEnvironment: (env: string, type?: string, search?: string) =>
    getApiClient().get<Service[]>('/api/services', { params: { env, type, search } }).then(r => r.data),

  getByAppInstance: (appInstanceId: string, type?: string, search?: string) =>
    getApiClient().get<Service[]>(`/api/services/by-app-instance/${appInstanceId}`, { params: { type, search } }).then(r => r.data),

  getWithImageSizes: (appInstanceId: string) =>
    getApiClient().get<ServiceWithImageSize[]>(`/api/services/with-image-sizes/${appInstanceId}`).then(r => r.data),

  getWorkloadTypes: (env: string) =>
    getApiClient().get<{ types: string[] }>('/api/services/workload-types', { params: { env } }).then(r => r.data),

  getAppInstancesTree: () =>
    getApiClient().get<AppInstanceTreeItem[]>('/api/services/app-instances/tree').then(r => r.data),

  getImageTags: (serviceId: string) =>
    getApiClient().get<ImageTag[]>(`/api/services/${serviceId}/image-tags`).then(r => r.data),

  updateServiceImage: (serviceId: string, tag: string) =>
    getApiClient().put(`/api/services/${serviceId}/update-image`, { tag }).then(r => r.data),

  syncServices: (dto: SyncServicesDto) =>
    getApiClient().post('/api/services/sync', dto).then(r => r.data),

  getSyncHistory: (env?: string) =>
    getApiClient().get<SyncHistoryEntry[]>('/api/services/sync/history', { params: { env } }).then(r => r.data),

  getDetailedSyncHistory: (env?: string) =>
    getApiClient().get<SyncHistoryEntry[]>('/api/services/sync/history/detailed', { params: { env } }).then(r => r.data),

  compareServices: (source: string, target: string) =>
    getApiClient().get<CompareResult>('/api/services/compare', { params: { source, target } }).then(r => r.data),

  compareByInstance: (source: string, target: string) =>
    getApiClient().get<CompareResult>('/api/services/compare/by-instance', { params: { source, target } }).then(r => r.data),

  testApiEndpoints: (siteId: string) =>
    getApiClient().get(`/api/services/test-api/${siteId}`).then(r => r.data),

  testApiStructure: (siteId: string) =>
    getApiClient().get(`/api/services/test-structure/${siteId}`).then(r => r.data),

  debugAppInstances: (environmentId: string) =>
    getApiClient().get(`/api/services/debug/app-instances/${environmentId}`).then(r => r.data),

  debugClusters: (siteId: string) =>
    getApiClient().get(`/api/services/debug/clusters/${siteId}`).then(r => r.data),

  debugImageInfo: (serviceId: string) =>
    getApiClient().get(`/api/services/${serviceId}/debug-image-info`).then(r => r.data),
};
