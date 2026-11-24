import { getApiClient } from '../api/client';
import type { CreateGenericClusterSiteDto, UpdateGenericClusterSiteDto, GenericCluster } from '../api/types';

export const GenericClustersRepository = {
  create: (dto: CreateGenericClusterSiteDto) =>
    getApiClient().post<GenericCluster>('/api/generic-clusters', dto).then(r => r.data),

  findAll: () =>
    getApiClient().get<GenericCluster[]>('/api/generic-clusters').then(r => r.data),

  findOne: (id: string) =>
    getApiClient().get<GenericCluster>(`/api/generic-clusters/${id}`).then(r => r.data),

  update: (id: string, dto: UpdateGenericClusterSiteDto) =>
    getApiClient().put<GenericCluster>(`/api/generic-clusters/${id}`, dto).then(r => r.data),

  remove: (id: string) =>
    getApiClient().delete(`/api/generic-clusters/${id}`).then(r => r.data),

  testConnection: (id: string) =>
    getApiClient().post(`/api/generic-clusters/${id}/test`, {}).then(r => r.data),

  setActive: (id: string, active: boolean) =>
    getApiClient().post(`/api/generic-clusters/${id}/set-active`, { active }).then(r => r.data),

  getNamespaces: (id: string) =>
    getApiClient().get(`/api/generic-clusters/${id}/namespaces`).then(r => r.data),
};
