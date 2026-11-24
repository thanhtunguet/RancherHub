import { getApiClient } from '../api/client';
import type { CreateSiteDto, UpdateSiteDto, Site, TestConnectionResponse } from '../api/types';

export const SitesRepository = {
  create: (dto: CreateSiteDto) =>
    getApiClient().post<Site>('/api/sites', dto).then(r => r.data),

  findAll: () =>
    getApiClient().get<Site[]>('/api/sites').then(r => r.data),

  findOne: (id: string) =>
    getApiClient().get<Site>(`/api/sites/${id}`).then(r => r.data),

  update: (id: string, dto: UpdateSiteDto) =>
    getApiClient().patch<Site>(`/api/sites/${id}`, dto).then(r => r.data),

  remove: (id: string) =>
    getApiClient().delete(`/api/sites/${id}`).then(r => r.data),

  testConnection: (id: string) =>
    getApiClient().post<TestConnectionResponse>(`/api/sites/${id}/test`, {}).then(r => r.data),

  activate: (id: string) =>
    getApiClient().post(`/api/sites/${id}/activate`, {}).then(r => r.data),

  deactivate: (id: string) =>
    getApiClient().post(`/api/sites/${id}/deactivate`, {}).then(r => r.data),

  getActiveSite: () =>
    getApiClient().get<Site>('/api/sites/active').then(r => r.data),

  getClusters: (id: string) =>
    getApiClient().get(`/api/sites/${id}/clusters`).then(r => r.data),

  getNamespaces: (id: string, clusterId?: string) =>
    getApiClient().get(`/api/sites/${id}/namespaces`, { params: { clusterId } }).then(r => r.data),
};
