import { getApiClient } from '../api/client';
import type {
  ConfigMap,
  ConfigMapCompareResult,
  ConfigMapDetailResult,
  SyncConfigMapKeyDto,
  SyncConfigMapKeysDto,
} from '../api/types';

export const ConfigMapsRepository = {
  getByAppInstance: (appInstanceId: string) =>
    getApiClient().get<ConfigMap[]>(`/api/configmaps/by-app-instance/${appInstanceId}`).then(r => r.data),

  compareByInstance: (source: string, target: string) =>
    getApiClient().get<ConfigMapCompareResult>('/api/configmaps/compare/by-instance', { params: { source, target } }).then(r => r.data),

  getDetails: (configMapName: string, source: string, target: string) =>
    getApiClient().get<ConfigMapDetailResult>(`/api/configmaps/${configMapName}/details`, { params: { source, target } }).then(r => r.data),

  syncKey: (data: SyncConfigMapKeyDto) =>
    getApiClient().post('/api/configmaps/sync-key', data).then(r => r.data),

  syncKeys: (data: SyncConfigMapKeysDto) =>
    getApiClient().post('/api/configmaps/sync-keys', data).then(r => r.data),
};
