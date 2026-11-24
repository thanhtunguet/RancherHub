import { getApiClient } from '../api/client';
import type { CreateHarborSiteDto, UpdateHarborSiteDto, HarborSite, TestHarborConnectionDto } from '../api/types';

export const HarborSitesRepository = {
  create: (dto: CreateHarborSiteDto) =>
    getApiClient().post<HarborSite>('/api/harbor-sites', dto).then(r => r.data),

  findAll: () =>
    getApiClient().get<HarborSite[]>('/api/harbor-sites').then(r => r.data),

  findOne: (id: string) =>
    getApiClient().get<HarborSite>(`/api/harbor-sites/${id}`).then(r => r.data),

  update: (id: string, dto: UpdateHarborSiteDto) =>
    getApiClient().patch<HarborSite>(`/api/harbor-sites/${id}`, dto).then(r => r.data),

  remove: (id: string) =>
    getApiClient().delete(`/api/harbor-sites/${id}`).then(r => r.data),

  testConnection: (dto: TestHarborConnectionDto) =>
    getApiClient().post('/api/harbor-sites/test-connection', dto).then(r => r.data),

  testSiteConnection: (id: string) =>
    getApiClient().post(`/api/harbor-sites/${id}/test`, {}).then(r => r.data),

  activate: (id: string) =>
    getApiClient().post(`/api/harbor-sites/${id}/activate`, {}).then(r => r.data),

  deactivate: (id: string) =>
    getApiClient().post(`/api/harbor-sites/${id}/deactivate`, {}).then(r => r.data),

  getActiveSite: () =>
    getApiClient().get<HarborSite>('/api/harbor-sites/active').then(r => r.data),

  getProjects: (id: string) =>
    getApiClient().get(`/api/harbor-sites/${id}/projects`).then(r => r.data),

  getRepositories: (id: string, projectName: string) =>
    getApiClient().get(`/api/harbor-sites/${id}/repositories/${encodeURIComponent(projectName)}`).then(r => r.data),

  getArtifacts: (id: string, projectName: string, repositoryName: string) =>
    getApiClient().get(`/api/harbor-sites/${id}/artifacts/${encodeURIComponent(projectName)}/${encodeURIComponent(repositoryName)}`).then(r => r.data),

  getTagDetail: (id: string, projectName: string, repositoryName: string, tag: string) =>
    getApiClient().get(`/api/harbor-sites/${id}/tag-detail/${encodeURIComponent(projectName)}/${encodeURIComponent(repositoryName)}/${encodeURIComponent(tag)}`).then(r => r.data),

  testImageSize: (id: string, imageTag: string) =>
    getApiClient().get(`/api/harbor-sites/${id}/test-image-size`, { params: { imageTag } }).then(r => r.data),
};
