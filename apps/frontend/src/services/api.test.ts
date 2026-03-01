/**
 * Tests for apps/frontend/src/services/api.ts
 *
 * Mocking strategy: same as auth.test.ts — jest.mock('axios') intercepts
 * axios.create() before the service module initialises the `api` instance.
 * The mock captures the request/response interceptors registered by the
 * service so we can invoke them directly in interceptor tests.
 *
 * Endpoint wrapper tests verify the correct HTTP method, URL, params/body,
 * and that response.data is returned.
 */

// ---- axios mock (must be hoisted before any imports) ----------------------

const requestInterceptors: Array<(cfg: any) => any> = [];
const responseInterceptors: Array<{
  onFulfilled: (r: any) => any;
  onRejected: (e: any) => any;
}> = [];

const mockGet = jest.fn();
const mockPost = jest.fn();
const mockPatch = jest.fn();
const mockPut = jest.fn();
const mockDelete = jest.fn();

const mockApiInstance = {
  get: mockGet,
  post: mockPost,
  patch: mockPatch,
  put: mockPut,
  delete: mockDelete,
  interceptors: {
    request: {
      use: (onFulfilled: (cfg: any) => any) => {
        requestInterceptors.push(onFulfilled);
      },
    },
    response: {
      use: (onFulfilled: (r: any) => any, onRejected: (e: any) => any) => {
        responseInterceptors.push({ onFulfilled, onRejected });
      },
    },
  },
};

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    create: jest.fn(() => mockApiInstance),
    Axios: class {},
  },
}));

// ---- imports (after mock) -------------------------------------------------

import {
  sitesApi,
  environmentsApi,
  appInstancesApi,
  servicesApi,
  genericClusterSitesApi,
  harborSitesApi,
  configMapsApi,
  secretsApi,
  usersApi,
} from '../services/api';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeResponse(data: unknown, status = 200) {
  return { data, status, statusText: 'OK', headers: {}, config: {} };
}

async function runRequestInterceptors(config: any): Promise<any> {
  let cfg = config;
  for (const handler of requestInterceptors) {
    cfg = await handler(cfg);
  }
  return cfg;
}

async function runResponseErrorInterceptors(error: any): Promise<never> {
  for (const { onRejected } of responseInterceptors) {
    try {
      await onRejected(error);
    } catch (e) {
      // continue to next interceptor
    }
  }
  throw error;
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  mockGet.mockReset();
  mockPost.mockReset();
  mockPatch.mockReset();
  mockPut.mockReset();
  mockDelete.mockReset();
  (window.location as any).href = 'http://localhost/';
});

// ---------------------------------------------------------------------------
// Request interceptor — token attachment
// ---------------------------------------------------------------------------

describe('api – request interceptor (token attachment)', () => {
  it('injects Authorization: Bearer <token> when auth_token is present', async () => {
    localStorage.setItem('auth_token', 'api-token-xyz');
    const config: any = { headers: {} };
    const result = await runRequestInterceptors(config);
    expect(result.headers.Authorization).toBe('Bearer api-token-xyz');
  });

  it('leaves headers untouched when no token is in localStorage', async () => {
    const config: any = { headers: {} };
    const result = await runRequestInterceptors(config);
    expect(result.headers.Authorization).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Response interceptor — 401 handling
// ---------------------------------------------------------------------------

describe('api – response interceptor (401 handling)', () => {
  it('clears auth_token + auth_user and redirects to /login on 401', async () => {
    localStorage.setItem('auth_token', 'stale-token');
    localStorage.setItem('auth_user', JSON.stringify({ id: 'u1' }));

    const error = { response: { status: 401, data: {} } };
    await expect(runResponseErrorInterceptors(error)).rejects.toBeDefined();

    expect(localStorage.getItem('auth_token')).toBeNull();
    expect(localStorage.getItem('auth_user')).toBeNull();
    expect((window.location as any).href).toBe('/login');
  });

  it('does NOT redirect on 403 errors', async () => {
    localStorage.setItem('auth_token', 'valid-token');
    const error = { response: { status: 403, data: {} } };
    await expect(runResponseErrorInterceptors(error)).rejects.toBeDefined();
    expect((window.location as any).href).not.toBe('/login');
    expect(localStorage.getItem('auth_token')).toBe('valid-token');
  });

  it('does NOT redirect on network errors (no response)', async () => {
    localStorage.setItem('auth_token', 'valid-token');
    const error = new Error('Network error');
    await expect(runResponseErrorInterceptors(error)).rejects.toBeDefined();
    expect((window.location as any).href).not.toBe('/login');
  });
});

// ---------------------------------------------------------------------------
// sitesApi
// ---------------------------------------------------------------------------

describe('sitesApi', () => {
  it('getAll: GET /api/sites → returns data', async () => {
    const data = [{ id: 's1', name: 'prod' }];
    mockGet.mockResolvedValueOnce(makeResponse(data));
    const result = await sitesApi.getAll();
    expect(mockGet).toHaveBeenCalledWith('/api/sites');
    expect(result).toEqual(data);
  });

  it('getOne: GET /api/sites/:id → returns data', async () => {
    const data = { id: 's1', name: 'prod' };
    mockGet.mockResolvedValueOnce(makeResponse(data));
    const result = await sitesApi.getOne('s1');
    expect(mockGet).toHaveBeenCalledWith('/api/sites/s1');
    expect(result).toEqual(data);
  });

  it('create: POST /api/sites with body → returns data', async () => {
    const body = { name: 'dev', url: 'https://rancher.dev', token: 'tok' };
    const data = { id: 's2', ...body };
    mockPost.mockResolvedValueOnce(makeResponse(data));
    const result = await sitesApi.create(body);
    expect(mockPost).toHaveBeenCalledWith('/api/sites', body);
    expect(result).toEqual(data);
  });

  it('update: PATCH /api/sites/:id with partial body → returns data', async () => {
    const data = { id: 's1', name: 'updated', url: 'https://x', token: 't', active: true, createdAt: '', updatedAt: '' };
    mockPatch.mockResolvedValueOnce(makeResponse(data));
    const result = await sitesApi.update('s1', { name: 'updated' });
    expect(mockPatch).toHaveBeenCalledWith('/api/sites/s1', { name: 'updated' });
    expect(result).toEqual(data);
  });

  it('delete: DELETE /api/sites/:id → returns undefined', async () => {
    mockDelete.mockResolvedValueOnce(makeResponse(null, 204));
    const result = await sitesApi.delete('s1');
    expect(mockDelete).toHaveBeenCalledWith('/api/sites/s1');
    expect(result).toBeUndefined();
  });

  it('testConnection: POST /api/sites/:id/test → returns data', async () => {
    const data = { success: true, message: 'OK' };
    mockPost.mockResolvedValueOnce(makeResponse(data));
    const result = await sitesApi.testConnection('s1');
    expect(mockPost).toHaveBeenCalledWith('/api/sites/s1/test');
    expect(result).toEqual(data);
  });

  it('activate: POST /api/sites/:id/activate → returns data', async () => {
    const data = { id: 's1', active: true, name: 'prod', url: 'https://x', createdAt: '', updatedAt: '' };
    mockPost.mockResolvedValueOnce(makeResponse(data));
    const result = await sitesApi.activate('s1');
    expect(mockPost).toHaveBeenCalledWith('/api/sites/s1/activate');
    expect(result).toEqual(data);
  });

  it('getNamespaces: GET /api/sites/:id/namespaces with optional clusterId param', async () => {
    const data = [{ id: 'n1', name: 'default', projectId: 'p1', clusterId: 'c1' }];
    mockGet.mockResolvedValueOnce(makeResponse(data));
    const result = await sitesApi.getNamespaces('s1', 'c1');
    expect(mockGet).toHaveBeenCalledWith('/api/sites/s1/namespaces', { params: { clusterId: 'c1' } });
    expect(result).toEqual(data);
  });

  it('getNamespaces: GET /api/sites/:id/namespaces without clusterId', async () => {
    const data: any[] = [];
    mockGet.mockResolvedValueOnce(makeResponse(data));
    await sitesApi.getNamespaces('s1');
    expect(mockGet).toHaveBeenCalledWith('/api/sites/s1/namespaces', { params: {} });
  });
});

// ---------------------------------------------------------------------------
// environmentsApi
// ---------------------------------------------------------------------------

describe('environmentsApi', () => {
  it('getAll: GET /api/environments', async () => {
    mockGet.mockResolvedValueOnce(makeResponse([]));
    await environmentsApi.getAll();
    expect(mockGet).toHaveBeenCalledWith('/api/environments');
  });

  it('create: POST /api/environments with body', async () => {
    const body = { name: 'staging', color: '#00f' };
    const data = { id: 'e1', ...body, createdAt: '', updatedAt: '' };
    mockPost.mockResolvedValueOnce(makeResponse(data));
    const result = await environmentsApi.create(body);
    expect(mockPost).toHaveBeenCalledWith('/api/environments', body);
    expect(result).toEqual(data);
  });

  it('update: PATCH /api/environments/:id', async () => {
    const data = { id: 'e1', name: 'prod', color: '#f00', createdAt: '', updatedAt: '' };
    mockPatch.mockResolvedValueOnce(makeResponse(data));
    await environmentsApi.update('e1', { name: 'prod' });
    expect(mockPatch).toHaveBeenCalledWith('/api/environments/e1', { name: 'prod' });
  });

  it('delete: DELETE /api/environments/:id → undefined', async () => {
    mockDelete.mockResolvedValueOnce(makeResponse(null, 204));
    const result = await environmentsApi.delete('e1');
    expect(result).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// appInstancesApi
// ---------------------------------------------------------------------------

describe('appInstancesApi', () => {
  it('getAll: GET /api/app-instances without env param', async () => {
    mockGet.mockResolvedValueOnce(makeResponse([]));
    await appInstancesApi.getAll();
    expect(mockGet).toHaveBeenCalledWith('/api/app-instances', { params: {} });
  });

  it('getAll: GET /api/app-instances with environmentId param', async () => {
    mockGet.mockResolvedValueOnce(makeResponse([]));
    await appInstancesApi.getAll('env-1');
    expect(mockGet).toHaveBeenCalledWith('/api/app-instances', { params: { env: 'env-1' } });
  });

  it('getOne: GET /api/app-instances/:id', async () => {
    const data = { id: 'ai1' };
    mockGet.mockResolvedValueOnce(makeResponse(data));
    const result = await appInstancesApi.getOne('ai1');
    expect(mockGet).toHaveBeenCalledWith('/api/app-instances/ai1');
    expect(result).toEqual(data);
  });

  it('create: POST /api/app-instances with body', async () => {
    const body = { name: 'app', cluster: 'c1', namespace: 'ns', environmentId: 'e1', clusterType: 'rancher' as const };
    const data = { id: 'ai2', ...body, rancherSiteId: null, genericClusterSiteId: null, createdAt: '', updatedAt: '' };
    mockPost.mockResolvedValueOnce(makeResponse(data));
    const result = await appInstancesApi.create(body);
    expect(mockPost).toHaveBeenCalledWith('/api/app-instances', body);
    expect(result).toEqual(data);
  });

  it('delete: DELETE /api/app-instances/:id → undefined', async () => {
    mockDelete.mockResolvedValueOnce(makeResponse(null, 204));
    const result = await appInstancesApi.delete('ai1');
    expect(result).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// servicesApi
// ---------------------------------------------------------------------------

describe('servicesApi', () => {
  it('getByEnvironment: GET /api/services with env and optional filters', async () => {
    mockGet.mockResolvedValueOnce(makeResponse([]));
    await servicesApi.getByEnvironment('env-1', { type: 'Deployment', search: 'foo' });
    expect(mockGet).toHaveBeenCalledWith('/api/services', {
      params: { env: 'env-1', type: 'Deployment', search: 'foo' },
    });
  });

  it('getByEnvironment: omits undefined filters', async () => {
    mockGet.mockResolvedValueOnce(makeResponse([]));
    await servicesApi.getByEnvironment('env-1');
    expect(mockGet).toHaveBeenCalledWith('/api/services', { params: { env: 'env-1' } });
  });

  it('sync: POST /api/services/sync with body', async () => {
    const body = { sourceEnvironmentId: 'e1', targetEnvironmentId: 'e2', serviceIds: ['s1'], targetAppInstanceIds: ['ai1'] };
    const data = { id: 'op1', status: 'pending', ...body, startTime: '', createdAt: '' };
    mockPost.mockResolvedValueOnce(makeResponse(data));
    const result = await servicesApi.sync(body);
    expect(mockPost).toHaveBeenCalledWith('/api/services/sync', body);
    expect(result).toEqual(data);
  });

  it('updateServiceImage: PUT /api/services/:id/update-image with tag', async () => {
    const data = { success: true, message: 'updated', service: { id: 's1', name: 'app', oldImageTag: 'v1', newImageTag: 'v2', fullNewImageTag: 'img:v2' } };
    mockPut.mockResolvedValueOnce(makeResponse(data));
    const result = await servicesApi.updateServiceImage('s1', 'v2');
    expect(mockPut).toHaveBeenCalledWith('/api/services/s1/update-image', { tag: 'v2' });
    expect(result).toEqual(data);
  });

  it('getImageTags: GET /api/services/:id/image-tags', async () => {
    const data = [{ name: 'v1', pushedAt: '2024-01-01' }];
    mockGet.mockResolvedValueOnce(makeResponse(data));
    const result = await servicesApi.getImageTags('s1');
    expect(mockGet).toHaveBeenCalledWith('/api/services/s1/image-tags');
    expect(result).toEqual(data);
  });

  it('compareServices: GET /api/services/compare with source+target params', async () => {
    mockGet.mockResolvedValueOnce(makeResponse({ diffs: [] }));
    await servicesApi.compareServices('e1', 'e2');
    expect(mockGet).toHaveBeenCalledWith('/api/services/compare', {
      params: { source: 'e1', target: 'e2' },
    });
  });

  it('getSyncHistory: GET /api/services/sync/history without env', async () => {
    mockGet.mockResolvedValueOnce(makeResponse([]));
    await servicesApi.getSyncHistory();
    expect(mockGet).toHaveBeenCalledWith('/api/services/sync/history', { params: {} });
  });

  it('getSyncHistory: GET /api/services/sync/history with env', async () => {
    mockGet.mockResolvedValueOnce(makeResponse([]));
    await servicesApi.getSyncHistory('env-1');
    expect(mockGet).toHaveBeenCalledWith('/api/services/sync/history', { params: { env: 'env-1' } });
  });
});

// ---------------------------------------------------------------------------
// genericClusterSitesApi
// ---------------------------------------------------------------------------

describe('genericClusterSitesApi', () => {
  it('getAll: GET /api/generic-clusters', async () => {
    mockGet.mockResolvedValueOnce(makeResponse([]));
    await genericClusterSitesApi.getAll();
    expect(mockGet).toHaveBeenCalledWith('/api/generic-clusters');
  });

  it('create: POST /api/generic-clusters with body', async () => {
    const body = { name: 'cluster-a', kubeconfig: 'yaml...' };
    const data = { id: 'gc1', name: 'cluster-a', clusterName: null, serverUrl: null, active: false, createdAt: '', updatedAt: '' };
    mockPost.mockResolvedValueOnce(makeResponse(data));
    const result = await genericClusterSitesApi.create(body);
    expect(mockPost).toHaveBeenCalledWith('/api/generic-clusters', body);
    expect(result).toEqual(data);
  });

  it('update: PUT /api/generic-clusters/:id', async () => {
    const data = { id: 'gc1', name: 'renamed', clusterName: null, serverUrl: null, active: false, createdAt: '', updatedAt: '' };
    mockPut.mockResolvedValueOnce(makeResponse(data));
    await genericClusterSitesApi.update('gc1', { name: 'renamed' });
    expect(mockPut).toHaveBeenCalledWith('/api/generic-clusters/gc1', { name: 'renamed' });
  });

  it('setActive: POST /api/generic-clusters/:id/set-active with active flag', async () => {
    const data = { id: 'gc1', active: true, name: 'x', clusterName: null, serverUrl: null, createdAt: '', updatedAt: '' };
    mockPost.mockResolvedValueOnce(makeResponse(data));
    const result = await genericClusterSitesApi.setActive('gc1', true);
    expect(mockPost).toHaveBeenCalledWith('/api/generic-clusters/gc1/set-active', { active: true });
    expect(result).toEqual(data);
  });

  it('delete: DELETE /api/generic-clusters/:id → undefined', async () => {
    mockDelete.mockResolvedValueOnce(makeResponse(null, 204));
    const result = await genericClusterSitesApi.delete('gc1');
    expect(result).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// harborSitesApi
// ---------------------------------------------------------------------------

describe('harborSitesApi', () => {
  it('getAll: GET /api/harbor-sites', async () => {
    mockGet.mockResolvedValueOnce(makeResponse([]));
    await harborSitesApi.getAll();
    expect(mockGet).toHaveBeenCalledWith('/api/harbor-sites');
  });

  it('create: POST /api/harbor-sites with body', async () => {
    const body = { name: 'harbor', url: 'https://harbor.local', username: 'admin', password: 'pass' };
    const data = { id: 'h1', ...body, active: true, createdAt: '', updatedAt: '' };
    mockPost.mockResolvedValueOnce(makeResponse(data));
    const result = await harborSitesApi.create(body);
    expect(mockPost).toHaveBeenCalledWith('/api/harbor-sites', body);
    expect(result).toEqual(data);
  });

  it('testConnection: POST /api/harbor-sites/test-connection with credentials', async () => {
    const body = { url: 'https://harbor.local', username: 'admin', password: 'pass' };
    mockPost.mockResolvedValueOnce(makeResponse({ success: true, message: 'OK' }));
    await harborSitesApi.testConnection(body);
    expect(mockPost).toHaveBeenCalledWith('/api/harbor-sites/test-connection', body);
  });

  it('getProjects: GET /api/harbor-sites/:id/projects', async () => {
    mockGet.mockResolvedValueOnce(makeResponse([]));
    await harborSitesApi.getProjects('h1');
    expect(mockGet).toHaveBeenCalledWith('/api/harbor-sites/h1/projects');
  });

  it('getRepositories: GET with encoded project name', async () => {
    mockGet.mockResolvedValueOnce(makeResponse([]));
    await harborSitesApi.getRepositories('h1', 'my project');
    expect(mockGet).toHaveBeenCalledWith('/api/harbor-sites/h1/repositories/my%20project');
  });

  it('activate: POST /api/harbor-sites/:id/activate', async () => {
    const data = { id: 'h1', active: true, name: 'h', url: 'u', username: 'a', createdAt: '', updatedAt: '' };
    mockPost.mockResolvedValueOnce(makeResponse(data));
    await harborSitesApi.activate('h1');
    expect(mockPost).toHaveBeenCalledWith('/api/harbor-sites/h1/activate');
  });

  it('remove: DELETE /api/harbor-sites/:id → undefined', async () => {
    mockDelete.mockResolvedValueOnce(makeResponse(null, 204));
    const result = await harborSitesApi.remove('h1');
    expect(result).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// configMapsApi
// ---------------------------------------------------------------------------

describe('configMapsApi', () => {
  it('getByAppInstance: GET /api/configmaps/by-app-instance/:id', async () => {
    mockGet.mockResolvedValueOnce(makeResponse([]));
    await configMapsApi.getByAppInstance('ai1');
    expect(mockGet).toHaveBeenCalledWith('/api/configmaps/by-app-instance/ai1');
  });

  it('syncConfigMapKey: POST /api/configmaps/sync-key with sync data', async () => {
    const syncData = { sourceAppInstanceId: 'ai1', targetAppInstanceId: 'ai2', configMapName: 'cm', key: 'k', value: 'v' };
    mockPost.mockResolvedValueOnce(makeResponse({ success: true }));
    await configMapsApi.syncConfigMapKey(syncData);
    expect(mockPost).toHaveBeenCalledWith('/api/configmaps/sync-key', syncData);
  });

  it('compareConfigMapsByInstance: GET /api/configmaps/compare/by-instance with params', async () => {
    mockGet.mockResolvedValueOnce(makeResponse({}));
    await configMapsApi.compareConfigMapsByInstance('ai1', 'ai2');
    expect(mockGet).toHaveBeenCalledWith('/api/configmaps/compare/by-instance', { params: { source: 'ai1', target: 'ai2' } });
  });
});

// ---------------------------------------------------------------------------
// secretsApi
// ---------------------------------------------------------------------------

describe('secretsApi', () => {
  it('getByAppInstance: GET /api/secrets/by-app-instance/:id', async () => {
    mockGet.mockResolvedValueOnce(makeResponse([]));
    await secretsApi.getByAppInstance('ai1');
    expect(mockGet).toHaveBeenCalledWith('/api/secrets/by-app-instance/ai1');
  });

  it('syncSecretKey: POST /api/secrets/sync-key with sync data', async () => {
    const syncData = { sourceAppInstanceId: 'ai1', targetAppInstanceId: 'ai2', secretName: 'sec', key: 'k', value: 'v' };
    mockPost.mockResolvedValueOnce(makeResponse({ success: true }));
    await secretsApi.syncSecretKey(syncData);
    expect(mockPost).toHaveBeenCalledWith('/api/secrets/sync-key', syncData);
  });
});

// ---------------------------------------------------------------------------
// usersApi
// ---------------------------------------------------------------------------

describe('usersApi', () => {
  it('getAll: GET /api/users with optional params', async () => {
    mockGet.mockResolvedValueOnce(makeResponse({ users: [], total: 0 }));
    await usersApi.getAll({ page: 1, limit: 10 } as any);
    expect(mockGet).toHaveBeenCalledWith('/api/users', { params: { page: 1, limit: 10 } });
  });

  it('getOne: GET /api/users/:id', async () => {
    const user = { id: 'u1', username: 'alice' };
    mockGet.mockResolvedValueOnce(makeResponse(user));
    const result = await usersApi.getOne('u1');
    expect(mockGet).toHaveBeenCalledWith('/api/users/u1');
    expect(result).toEqual(user);
  });

  it('create: POST /api/users with body', async () => {
    const body = { username: 'newuser', email: 'n@x.com', password: 'pass' };
    const data = { id: 'u2', username: 'newuser', email: 'n@x.com', active: true, twoFactorEnabled: false, isFirstLogin: true };
    mockPost.mockResolvedValueOnce(makeResponse(data));
    const result = await usersApi.create(body as any);
    expect(mockPost).toHaveBeenCalledWith('/api/users', body);
    expect(result).toEqual(data);
  });

  it('update: PATCH /api/users/:id', async () => {
    const data = { id: 'u1', username: 'alice', email: 'a@x.com', active: false, twoFactorEnabled: false, isFirstLogin: false };
    mockPatch.mockResolvedValueOnce(makeResponse(data));
    await usersApi.update('u1', { active: false } as any);
    expect(mockPatch).toHaveBeenCalledWith('/api/users/u1', { active: false });
  });

  it('delete: DELETE /api/users/:id with data body → undefined', async () => {
    mockDelete.mockResolvedValueOnce(makeResponse(null, 204));
    const result = await usersApi.delete('u1', { reason: 'test' } as any);
    expect(mockDelete).toHaveBeenCalledWith('/api/users/u1', { data: { reason: 'test' } });
    expect(result).toBeUndefined();
  });

  it('getStats: GET /api/users/stats', async () => {
    const stats = { total: 10, active: 8, inactive: 2, twoFactorEnabled: 3 };
    mockGet.mockResolvedValueOnce(makeResponse(stats));
    const result = await usersApi.getStats();
    expect(mockGet).toHaveBeenCalledWith('/api/users/stats');
    expect(result).toEqual(stats);
  });
});
