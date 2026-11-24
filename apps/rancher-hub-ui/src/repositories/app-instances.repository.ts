import { getApiClient } from '../api/client';
import type { CreateAppInstanceDto, UpdateAppInstanceDto, AppInstance } from '../api/types';

export const AppInstancesRepository = {
  create: (dto: CreateAppInstanceDto) =>
    getApiClient().post<AppInstance>('/api/app-instances', dto).then(r => r.data),

  findAll: (env?: string) =>
    getApiClient().get<AppInstance[]>('/api/app-instances', { params: { env } }).then(r => r.data),

  findOne: (id: string) =>
    getApiClient().get<AppInstance>(`/api/app-instances/${id}`).then(r => r.data),

  update: (id: string, dto: UpdateAppInstanceDto) =>
    getApiClient().patch<AppInstance>(`/api/app-instances/${id}`, dto).then(r => r.data),

  remove: (id: string) =>
    getApiClient().delete(`/api/app-instances/${id}`).then(r => r.data),

  findByEnvironment: (environmentId: string) =>
    getApiClient().get<AppInstance[]>(`/api/app-instances/by-environment/${environmentId}`).then(r => r.data),

  findBySite: (siteId: string) =>
    getApiClient().get<AppInstance[]>(`/api/app-instances/by-site/${siteId}`).then(r => r.data),
};
