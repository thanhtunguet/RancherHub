import { getApiClient } from '../api/client';
import type { CreateEnvironmentDto, UpdateEnvironmentDto, Environment, EnvironmentWithInstances } from '../api/types';

export const EnvironmentsRepository = {
  create: (dto: CreateEnvironmentDto) =>
    getApiClient().post<Environment>('/api/environments', dto).then(r => r.data),

  findAll: () =>
    getApiClient().get<Environment[]>('/api/environments').then(r => r.data),

  findOne: (id: string) =>
    getApiClient().get<Environment>(`/api/environments/${id}`).then(r => r.data),

  update: (id: string, dto: UpdateEnvironmentDto) =>
    getApiClient().patch<Environment>(`/api/environments/${id}`, dto).then(r => r.data),

  remove: (id: string) =>
    getApiClient().delete(`/api/environments/${id}`).then(r => r.data),

  findWithAppInstances: (id: string) =>
    getApiClient().get<EnvironmentWithInstances>(`/api/environments/${id}/with-instances`).then(r => r.data),
};
