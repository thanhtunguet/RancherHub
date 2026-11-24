import { getApiClient } from '../api/client';
import type { HealthStatus } from '../api/types';

export const HealthRepository = {
  getHello: () =>
    getApiClient().get<string>('/').then(r => r.data),

  getHealth: () =>
    getApiClient().get<HealthStatus>('/health').then(r => r.data),
};
