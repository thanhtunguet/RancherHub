import axios from "axios";
import type {
  RancherSite,
  Environment,
  AppInstance,
  Service,
  CreateSiteRequest,
  CreateEnvironmentRequest,
  CreateAppInstanceRequest,
  TestConnectionResponse,
  SyncServicesRequest,
  SyncOperation,
  RancherCluster,
  RancherNamespace,
} from "../types";

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add authentication token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      window.location.href = '/login';
    }
    console.error("API Error:", error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export const sitesApi = {
  getAll: (): Promise<RancherSite[]> =>
    api.get("/api/sites").then((res) => res.data),

  getOne: (id: string): Promise<RancherSite> =>
    api.get(`/api/sites/${id}`).then((res) => res.data),

  getActive: (): Promise<RancherSite | null> =>
    api.get("/api/sites/active").then((res) => res.data),

  create: (data: CreateSiteRequest): Promise<RancherSite> =>
    api.post("/api/sites", data).then((res) => res.data),

  update: (
    id: string,
    data: Partial<CreateSiteRequest>
  ): Promise<RancherSite> =>
    api.patch(`/api/sites/${id}`, data).then((res) => res.data),

  delete: (id: string): Promise<void> =>
    api.delete(`/api/sites/${id}`).then(() => undefined),

  testConnection: (id: string): Promise<TestConnectionResponse> =>
    api.post(`/api/sites/${id}/test`).then((res) => res.data),

  activate: (id: string): Promise<RancherSite> =>
    api.post(`/api/sites/${id}/activate`).then((res) => res.data),

  deactivate: (id: string): Promise<RancherSite> =>
    api.post(`/api/sites/${id}/deactivate`).then((res) => res.data),

  getClusters: (id: string): Promise<RancherCluster[]> =>
    api.get(`/api/sites/${id}/clusters`).then((res) => res.data),

  getNamespaces: (
    id: string,
    clusterId?: string
  ): Promise<RancherNamespace[]> =>
    api
      .get(`/api/sites/${id}/namespaces`, {
        params: clusterId ? { clusterId } : {},
      })
      .then((res) => res.data),
};

export const environmentsApi = {
  getAll: (): Promise<Environment[]> =>
    api.get("/api/environments").then((res) => res.data),

  getOne: (id: string): Promise<Environment> =>
    api.get(`/api/environments/${id}`).then((res) => res.data),

  getWithInstances: (id: string): Promise<Environment> =>
    api.get(`/api/environments/${id}/with-instances`).then((res) => res.data),

  create: (data: CreateEnvironmentRequest): Promise<Environment> =>
    api.post("/api/environments", data).then((res) => res.data),

  update: (
    id: string,
    data: Partial<CreateEnvironmentRequest>
  ): Promise<Environment> =>
    api.patch(`/api/environments/${id}`, data).then((res) => res.data),

  delete: (id: string): Promise<void> =>
    api.delete(`/api/environments/${id}`).then(() => undefined),
};

export const appInstancesApi = {
  getAll: (environmentId?: string): Promise<AppInstance[]> =>
    api
      .get("/api/app-instances", {
        params: environmentId ? { env: environmentId } : {},
      })
      .then((res) => res.data),

  getOne: (id: string): Promise<AppInstance> =>
    api.get(`/api/app-instances/${id}`).then((res) => res.data),

  getByEnvironment: (environmentId: string): Promise<AppInstance[]> =>
    api
      .get(`/api/app-instances/by-environment/${environmentId}`)
      .then((res) => res.data),

  getBySite: (siteId: string): Promise<AppInstance[]> =>
    api.get(`/api/app-instances/by-site/${siteId}`).then((res) => res.data),

  create: (data: CreateAppInstanceRequest): Promise<AppInstance> =>
    api.post("/api/app-instances", data).then((res) => res.data),

  update: (
    id: string,
    data: Partial<CreateAppInstanceRequest>
  ): Promise<AppInstance> =>
    api.patch(`/api/app-instances/${id}`, data).then((res) => res.data),

  delete: (id: string): Promise<void> =>
    api.delete(`/api/app-instances/${id}`).then(() => undefined),
};

export const servicesApi = {
  getByEnvironment: (
    environmentId: string,
    filters?: { type?: string; search?: string }
  ): Promise<Service[]> =>
    api
      .get("/api/services", {
        params: {
          env: environmentId,
          ...(filters?.type && { type: filters.type }),
          ...(filters?.search && { search: filters.search }),
        },
      })
      .then((res) => res.data),

  getByAppInstance: (
    appInstanceId: string,
    filters?: { type?: string; search?: string }
  ): Promise<Service[]> =>
    api
      .get(`/api/services/by-app-instance/${appInstanceId}`, {
        params: {
          ...(filters?.type && { type: filters.type }),
          ...(filters?.search && { search: filters.search }),
        },
      })
      .then((res) => res.data),

  getWorkloadTypes: (environmentId: string): Promise<{ types: string[] }> =>
    api
      .get("/api/services/workload-types", {
        params: { env: environmentId },
      })
      .then((res) => res.data),

  testApiEndpoints: (siteId: string): Promise<any> =>
    api.get(`/api/services/test-api/${siteId}`).then((res) => res.data),

  testApiStructure: (siteId: string): Promise<any> =>
    api.get(`/api/services/test-structure/${siteId}`).then((res) => res.data),

  debugAppInstances: (environmentId: string): Promise<any> =>
    api
      .get(`/api/services/debug/app-instances/${environmentId}`)
      .then((res) => res.data),

  debugClusters: (siteId: string): Promise<any> =>
    api.get(`/api/services/debug/clusters/${siteId}`).then((res) => res.data),

  sync: (data: SyncServicesRequest): Promise<SyncOperation> =>
    api.post("/api/services/sync", data).then((res) => res.data),

  getSyncHistory: (environmentId?: string): Promise<SyncOperation[]> =>
    api
      .get("/api/services/sync/history", {
        params: environmentId ? { env: environmentId } : {},
      })
      .then((res) => res.data),

  compareServices: (sourceEnvironmentId: string, targetEnvironmentId: string): Promise<any> =>
    api
      .get("/api/services/compare", {
        params: { source: sourceEnvironmentId, target: targetEnvironmentId },
      })
      .then((res) => res.data),

  compareServicesByInstance: (sourceAppInstanceId: string, targetAppInstanceId: string): Promise<any> =>
    api
      .get("/api/services/compare/by-instance", {
        params: { source: sourceAppInstanceId, target: targetAppInstanceId },
      })
      .then((res) => res.data),
};

export const configMapsApi = {
  getByAppInstance: (appInstanceId: string): Promise<any[]> =>
    api.get(`/api/configmaps/by-app-instance/${appInstanceId}`).then((res) => res.data),

  compareConfigMapsByInstance: (sourceAppInstanceId: string, targetAppInstanceId: string): Promise<any> =>
    api
      .get("/api/configmaps/compare/by-instance", {
        params: { source: sourceAppInstanceId, target: targetAppInstanceId },
      })
      .then((res) => res.data),

  getConfigMapDetails: (configMapName: string, sourceAppInstanceId: string, targetAppInstanceId: string): Promise<any> =>
    api
      .get(`/api/configmaps/${configMapName}/details`, {
        params: { source: sourceAppInstanceId, target: targetAppInstanceId },
      })
      .then((res) => res.data),

  syncConfigMapKey: (syncData: {
    sourceAppInstanceId: string;
    targetAppInstanceId: string;
    configMapName: string;
    key: string;
    value: string;
  }): Promise<any> =>
    api.post("/api/configmaps/sync-key", syncData).then((res) => res.data),

  syncConfigMapKeys: (syncData: {
    sourceAppInstanceId: string;
    targetAppInstanceId: string;
    configMapName: string;
    keys: Record<string, string>;
  }): Promise<any> =>
    api.post("/api/configmaps/sync-keys", syncData).then((res) => res.data),
};

export const monitoringApi = {
  // Configuration
  getConfig: (): Promise<any> =>
    api.get("/api/monitoring/config").then((res) => res.data),

  createOrUpdateConfig: (data: any): Promise<any> =>
    api.post("/api/monitoring/config", data).then((res) => res.data),

  updateConfig: (data: any): Promise<any> =>
    api.put("/api/monitoring/config", data).then((res) => res.data),

  testTelegramConnection: (data: any): Promise<{ success: boolean; message: string }> =>
    api.post("/api/monitoring/config/test-telegram", data).then((res) => res.data),

  // Monitored Instances
  getMonitoredInstances: (): Promise<any[]> =>
    api.get("/api/monitoring/instances").then((res) => res.data),

  getMonitoredInstance: (id: string): Promise<any> =>
    api.get(`/api/monitoring/instances/${id}`).then((res) => res.data),

  createMonitoredInstance: (data: any): Promise<any> =>
    api.post("/api/monitoring/instances", data).then((res) => res.data),

  updateMonitoredInstance: (id: string, data: any): Promise<any> =>
    api.put(`/api/monitoring/instances/${id}`, data).then((res) => res.data),

  deleteMonitoredInstance: (id: string): Promise<void> =>
    api.delete(`/api/monitoring/instances/${id}`).then(() => undefined),

  // History
  getMonitoringHistory: (instanceId?: string, days?: number): Promise<any[]> =>
    api.get("/api/monitoring/history", {
      params: { instanceId, days }
    }).then((res) => res.data),

  // Alerts
  getAlertHistory: (instanceId?: string, resolved?: boolean): Promise<any[]> =>
    api.get("/api/monitoring/alerts", {
      params: { instanceId, resolved }
    }).then((res) => res.data),

  resolveAlert: (id: string): Promise<any> =>
    api.put(`/api/monitoring/alerts/${id}/resolve`).then((res) => res.data),

  // Manual Triggers
  triggerDailyCheck: (): Promise<{ message: string }> =>
    api.post("/api/monitoring/trigger/daily-check").then((res) => res.data),

  triggerHourlyCheck: (): Promise<{ message: string }> =>
    api.post("/api/monitoring/trigger/hourly-check").then((res) => res.data),
};

export default api;
