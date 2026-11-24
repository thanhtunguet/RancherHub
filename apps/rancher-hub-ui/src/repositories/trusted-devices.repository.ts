import { getApiClient } from '../api/client';
import type { TrustedDevice } from '../api/types';

export const TrustedDevicesRepository = {
  getAll: () =>
    getApiClient().get<TrustedDevice[]>('/api/trusted-devices').then(r => r.data),

  revoke: (id: string) =>
    getApiClient().delete(`/api/trusted-devices/${id}`).then(r => r.data),

  revokeAll: () =>
    getApiClient().delete('/api/trusted-devices').then(r => r.data),
};
