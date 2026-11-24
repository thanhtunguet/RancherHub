import { getApiClient } from '../api/client';
import type {
  Secret,
  SecretCompareResult,
  SecretDetailResult,
  SyncSecretKeyDto,
  SyncSecretKeysDto,
} from '../api/types';

export const SecretsRepository = {
  getByAppInstance: (appInstanceId: string) =>
    getApiClient().get<Secret[]>(`/api/secrets/by-app-instance/${appInstanceId}`).then(r => r.data),

  compareByInstance: (source: string, target: string) =>
    getApiClient().get<SecretCompareResult>('/api/secrets/compare/by-instance', { params: { source, target } }).then(r => r.data),

  getDetails: (secretName: string, source: string, target: string) =>
    getApiClient().get<SecretDetailResult>(`/api/secrets/${secretName}/details`, { params: { source, target } }).then(r => r.data),

  syncKey: (data: SyncSecretKeyDto) =>
    getApiClient().post('/api/secrets/sync-key', data).then(r => r.data),

  syncKeys: (data: SyncSecretKeysDto) =>
    getApiClient().post('/api/secrets/sync-keys', data).then(r => r.data),
};
