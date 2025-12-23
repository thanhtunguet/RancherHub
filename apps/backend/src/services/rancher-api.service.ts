import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { RancherSite } from '../entities/rancher-site.entity';

export interface RancherProject {
  id: string;
  name: string;
  clusterId: string;
  description?: string;
}

export interface RancherNamespace {
  id: string;
  name: string;
  projectId: string;
  clusterId: string;
}

export interface RancherWorkload {
  id: string;
  name: string;
  type: string;
  namespaceId: string;
  state: string;
  image: string;
  scale: number;
  availableReplicas: number;
  containers?: any[];
}

export interface RancherCluster {
  id: string;
  name: string;
  state: string;
  description?: string;
}

@Injectable()
export class RancherApiService {
  private readonly logger = new Logger(RancherApiService.name);
  private clients: Map<string, AxiosInstance> = new Map();

  private getClient(site: RancherSite): AxiosInstance {
    if (!this.clients.has(site.id)) {
      const client = axios.create({
        baseURL: `${site.url}/v3`,
        headers: {
          Authorization: `Bearer ${site.token}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      });

      client.interceptors.request.use((config) => {
        this.logger.debug(`Making request to: ${config.url}`);
        return config;
      });

      client.interceptors.response.use(
        (response) => response,
        (error) => {
          this.logger.error(
            `Rancher API error for site ${site.name}: ${error.message}`,
          );
          throw error;
        },
      );

      this.clients.set(site.id, client);
    }

    return this.clients.get(site.id);
  }

  async testConnection(
    site: RancherSite,
  ): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      const client = this.getClient(site);
      const response = await client.get('/');

      return {
        success: true,
        message: 'Connection successful',
        data: {
          rancherVersion: response.data?.rancherVersion || 'Unknown',
          serverVersion: response.data?.serverVersion || 'Unknown',
        },
      };
    } catch (error) {
      let message = 'Connection failed';

      if (error.code === 'ECONNREFUSED') {
        message = 'Connection refused - server may be down';
      } else if (error.code === 'ENOTFOUND') {
        message = 'Server not found - check URL';
      } else if (error.response?.status === 401) {
        message = 'Authentication failed - check token';
      } else if (error.response?.status === 403) {
        message = 'Access forbidden - insufficient permissions';
      } else if (error.message) {
        message = error.message;
      }

      return { success: false, message };
    }
  }

  async testApiEndpoints(
    site: RancherSite,
  ): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      this.logger.debug(`Testing API endpoints for site: ${site.name}`);

      // Test different base URLs
      const baseUrls = [
        `${site.url}/v3`,
        `${site.url}/v1`,
        `${site.url}/api`,
        `${site.url}`,
      ];

      for (const baseUrl of baseUrls) {
        try {
          this.logger.debug(`Testing base URL: ${baseUrl}`);
          const testClient = axios.create({
            baseURL: baseUrl,
            headers: {
              Authorization: `Bearer ${site.token}`,
              'Content-Type': 'application/json',
            },
            timeout: 10000,
          });

          const response = await testClient.get('/');
          this.logger.debug(
            `Base URL ${baseUrl} works! Response keys: ${Object.keys(response.data || {}).join(', ')}`,
          );

          // Test some common endpoints to see what's available
          const availableEndpoints = [];

          // Test clusters endpoint
          try {
            await testClient.get('/clusters');
            availableEndpoints.push('clusters');
          } catch (e) {
            this.logger.debug(`Clusters endpoint not available: ${e.message}`);
          }

          // Test workloads endpoint
          try {
            await testClient.get('/workloads');
            availableEndpoints.push('workloads');
          } catch (e) {
            this.logger.debug(`Workloads endpoint not available: ${e.message}`);
          }

          // Test projects endpoint
          try {
            await testClient.get('/projects');
            availableEndpoints.push('projects');
          } catch (e) {
            this.logger.debug(`Projects endpoint not available: ${e.message}`);
          }

          return {
            success: true,
            message: `API endpoint found at ${baseUrl}`,
            data: {
              workingBaseUrl: baseUrl,
              responseData: response.data,
              availableEndpoints,
            },
          };
        } catch (endpointError) {
          this.logger.debug(
            `Base URL ${baseUrl} failed: ${endpointError.message}`,
          );
          continue;
        }
      }

      return { success: false, message: 'No working API endpoints found' };
    } catch (error) {
      return {
        success: false,
        message: `API endpoint test failed: ${error.message}`,
      };
    }
  }

  async getClusters(site: RancherSite): Promise<RancherCluster[]> {
    try {
      const client = this.getClient(site);
      const response: AxiosResponse = await client.get('/clusters');

      return response.data.data.map((cluster: any) => ({
        id: cluster.id,
        name: cluster.name,
        state: cluster.state,
        description: cluster.description,
      }));
    } catch (error) {
      this.logger.error(`Failed to fetch clusters: ${error.message}`);

      // For development/demo purposes, return some mock clusters if API fails
      if (process.env.NODE_ENV === 'development') {
        this.logger.warn('Returning mock clusters for development');
        return [
          {
            id: 'c-local',
            name: 'local',
            state: 'active',
            description: 'Local development cluster',
          },
          {
            id: 'c-dev',
            name: 'development',
            state: 'active',
            description: 'Development cluster',
          },
          {
            id: 'c-staging',
            name: 'staging',
            state: 'active',
            description: 'Staging cluster',
          },
        ];
      }

      throw error;
    }
  }

  async getProjects(
    site: RancherSite,
    clusterId?: string,
  ): Promise<RancherProject[]> {
    try {
      const client = this.getClient(site);
      let url = '/projects';

      if (clusterId) {
        url += `?clusterId=${clusterId}`;
      }

      const response: AxiosResponse = await client.get(url);

      return response.data.data.map((project: any) => ({
        id: project.id,
        name: project.name,
        clusterId: project.clusterId,
        description: project.description,
      }));
    } catch (error) {
      this.logger.error(`Failed to fetch projects: ${error.message}`);
      throw error;
    }
  }

  async getNamespaces(
    site: RancherSite,
    clusterId?: string,
  ): Promise<RancherNamespace[]> {
    try {
      const client = this.getClient(site);

      // If clusterId is provided, first get projects for that cluster, then get namespaces
      if (clusterId) {
        // Method 1: Try different possible endpoints for namespaces
        const possibleEndpoints = [
          `/namespaces?clusterId=${clusterId}`,
          `/clusters/${clusterId}/namespaces`,
          `/project/${clusterId}/namespaces`,
          `/k8s/clusters/${clusterId}/v1/namespaces`,
          `/k8s/clusters/${clusterId}/api/v1/namespaces`,
        ];

        for (const endpoint of possibleEndpoints) {
          try {
            this.logger.debug(`Trying namespace endpoint: ${endpoint}`);
            const response = await client.get(endpoint);

            let namespaces = [];

            // Handle different response formats
            if (response.data) {
              if (response.data.data) {
                // Rancher v3 API format
                namespaces = response.data.data;
              } else if (response.data.items) {
                // Kubernetes API format
                namespaces = response.data.items;
              } else if (Array.isArray(response.data)) {
                // Direct array format
                namespaces = response.data;
              }

              if (namespaces.length >= 0) {
                this.logger.debug(
                  `Successfully fetched ${namespaces.length} namespaces from endpoint: ${endpoint}`,
                );
                return namespaces.map((namespace: any) => ({
                  id:
                    namespace.id || namespace.metadata?.name || namespace.name,
                  name: namespace.name || namespace.metadata?.name,
                  projectId:
                    namespace.projectId ||
                    namespace.metadata?.labels?.['field.cattle.io/projectId'] ||
                    '',
                  clusterId:
                    namespace.clusterId ||
                    namespace.metadata?.labels?.['field.cattle.io/clusterId'] ||
                    clusterId,
                }));
              }
            }
          } catch (endpointError) {
            this.logger.debug(
              `Endpoint ${endpoint} failed: ${endpointError.message}`,
            );
            continue;
          }
        }

        // Method 2: If direct filtering fails, get projects first, then namespaces from each project
        this.logger.debug(
          `All direct endpoints failed, trying via projects for cluster: ${clusterId}`,
        );
        try {
          const projects = await this.getProjects(site, clusterId);
          this.logger.debug(
            `Found ${projects.length} projects for cluster ${clusterId}`,
          );

          const allNamespaces: RancherNamespace[] = [];

          for (const project of projects) {
            try {
              this.logger.debug(
                `Fetching namespaces for project: ${project.id}`,
              );
              const projectNamespaces = await client.get(
                `/namespaces?projectId=${project.id}`,
              );
              if (projectNamespaces.data && projectNamespaces.data.data) {
                const namespaces = projectNamespaces.data.data.map(
                  (namespace: any) => ({
                    id: namespace.id,
                    name: namespace.name,
                    projectId: namespace.projectId || project.id,
                    clusterId: namespace.clusterId || clusterId,
                  }),
                );
                this.logger.debug(
                  `Found ${namespaces.length} namespaces in project ${project.id}`,
                );
                allNamespaces.push(...namespaces);
              }
            } catch (projectError) {
              this.logger.warn(
                `Failed to fetch namespaces for project ${project.id}: ${projectError.message}`,
              );
            }
          }

          this.logger.debug(`Total namespaces found: ${allNamespaces.length}`);
          return allNamespaces;
        } catch (projectError) {
          this.logger.error(
            `Failed to fetch namespaces via projects: ${projectError.message}`,
          );
          throw projectError;
        }
      } else {
        // No cluster filter, get all namespaces
        const response = await client.get('/namespaces');
        return response.data.data.map((namespace: any) => ({
          id: namespace.id,
          name: namespace.name,
          projectId: namespace.projectId || '',
          clusterId: namespace.clusterId || '',
        }));
      }
    } catch (error) {
      this.logger.error(`Failed to fetch namespaces: ${error.message}`);

      // For development/demo purposes, return some mock namespaces if all methods fail
      if (process.env.NODE_ENV === 'development') {
        this.logger.warn('Returning mock namespaces for development');
        return [
          {
            id: 'default',
            name: 'default',
            projectId: 'p:' + (clusterId || 'cluster1'),
            clusterId: clusterId || 'c-local',
          },
          {
            id: 'kube-system',
            name: 'kube-system',
            projectId: 'p:' + (clusterId || 'cluster1'),
            clusterId: clusterId || 'c-local',
          },
          {
            id: 'cattle-system',
            name: 'cattle-system',
            projectId: 'p:' + (clusterId || 'cluster1'),
            clusterId: clusterId || 'c-local',
          },
        ];
      }

      throw error;
    }
  }

  async getWorkloads(
    site: RancherSite,
    clusterId: string,
    namespaceId: string,
  ): Promise<RancherWorkload[]> {
    try {
      const client = this.getClient(site);

      this.logger.debug(
        `Fetching workloads for site: ${site.name}, cluster: ${clusterId}, namespace: ${namespaceId}`,
      );
      this.logger.debug(`Base URL: ${site.url}/v3`);

      // Fetch different workload types separately for better accuracy
      const workloadTypes = [
        'deployments',
        'daemonsets',
        'statefulsets',
        'replicasets',
      ];
      const allWorkloads: RancherWorkload[] = [];

      // First try specific workload type endpoints
      for (const workloadType of workloadTypes) {
        try {
          const endpoints = [
            // Kubernetes API endpoints
            `/k8s/clusters/${clusterId}/v1/namespaces/${namespaceId}/${workloadType}`,
            `/k8s/clusters/${clusterId}/apis/apps/v1/namespaces/${namespaceId}/${workloadType}`,

            // Rancher v3 API endpoints
            `/workloads/${workloadType}?clusterId=${clusterId}&namespaceId=${namespaceId}`,
            `/project/${clusterId}:${namespaceId}/${workloadType}`,
          ];

          for (const endpoint of endpoints) {
            try {
              this.logger.debug(`Trying ${workloadType} endpoint: ${endpoint}`);
              const response: AxiosResponse = await client.get(endpoint);

              let workloads = [];
              if (response.data?.items) {
                workloads = response.data.items;
              } else if (response.data?.data) {
                workloads = response.data.data;
              } else if (Array.isArray(response.data)) {
                workloads = response.data;
              }

              if (workloads.length > 0) {
                this.logger.debug(
                  `Found ${workloads.length} ${workloadType} from endpoint: ${endpoint}`,
                );

                const mappedWorkloads = workloads.map((workload: any) =>
                  this.mapWorkloadData(
                    workload,
                    workloadType.slice(0, -1),
                    clusterId,
                    namespaceId,
                  ),
                );

                allWorkloads.push(...mappedWorkloads);
                break; // Success, move to next workload type
              }
            } catch (endpointError) {
              this.logger.debug(
                `${workloadType} endpoint ${endpoint} failed: ${endpointError.message}`,
              );
              continue;
            }
          }
        } catch (typeError) {
          this.logger.debug(
            `Failed to fetch ${workloadType}: ${typeError.message}`,
          );
        }
      }

      // If specific endpoints didn't work, try generic workloads endpoint
      if (allWorkloads.length === 0) {
        const genericEndpoints = [
          `/workloads?clusterId=${clusterId}&namespaceId=${namespaceId}`,
          `/workloads?clusterId=${clusterId}&namespace=${namespaceId}`,
          `/project/${clusterId}:${namespaceId}/workloads`,
          `/clusters/${clusterId}/workloads?namespaceId=${namespaceId}`,
        ];

        for (const endpoint of genericEndpoints) {
          try {
            this.logger.debug(`Trying generic workload endpoint: ${endpoint}`);
            const response: AxiosResponse = await client.get(endpoint);

            let workloads = [];
            if (response.data?.data) {
              workloads = response.data.data;
            } else if (response.data?.items) {
              workloads = response.data.items;
            } else if (Array.isArray(response.data)) {
              workloads = response.data;
            }

            if (workloads.length > 0) {
              this.logger.debug(
                `Found ${workloads.length} workloads from generic endpoint: ${endpoint}`,
              );

              const mappedWorkloads = workloads.map((workload: any) =>
                this.mapWorkloadData(workload, null, clusterId, namespaceId),
              );

              allWorkloads.push(...mappedWorkloads);
              break;
            }
          } catch (endpointError) {
            this.logger.debug(
              `Generic endpoint ${endpoint} failed: ${endpointError.message}`,
            );
            continue;
          }
        }
      }

      // Remove duplicates based on name and type
      const uniqueWorkloads = allWorkloads.filter(
        (workload, index, self) =>
          index ===
          self.findIndex(
            (w) => w.name === workload.name && w.type === workload.type,
          ),
      );

      this.logger.debug(
        `Total unique workloads found: ${uniqueWorkloads.length}`,
      );
      return uniqueWorkloads;
    } catch (error) {
      this.logger.error(`Failed to fetch workloads: ${error.message}`);

      // For development/demo purposes, return mock workloads if API fails
      if (process.env.NODE_ENV === 'development') {
        this.logger.warn('Returning mock workloads for development');
        return [
          {
            id: `${clusterId}:${namespaceId}:frontend-deployment`,
            name: 'frontend',
            type: 'deployment',
            namespaceId: namespaceId,
            state: 'active',
            image: 'nginx:1.21.0',
            scale: 2,
            availableReplicas: 2,
            containers: [{ name: 'frontend', image: 'nginx:1.21.0' }],
          },
          {
            id: `${clusterId}:${namespaceId}:backend-deployment`,
            name: 'backend',
            type: 'deployment',
            namespaceId: namespaceId,
            state: 'active',
            image: 'node:16-alpine',
            scale: 3,
            availableReplicas: 3,
            containers: [{ name: 'backend', image: 'node:16-alpine' }],
          },
          {
            id: `${clusterId}:${namespaceId}:logging-daemon`,
            name: 'logging-daemon',
            type: 'daemonset',
            namespaceId: namespaceId,
            state: 'active',
            image: 'fluentd:v1.14.0',
            scale: 3,
            availableReplicas: 3,
            containers: [{ name: 'fluentd', image: 'fluentd:v1.14.0' }],
          },
          {
            id: `${clusterId}:${namespaceId}:database-statefulset`,
            name: 'database',
            type: 'statefulset',
            namespaceId: namespaceId,
            state: 'active',
            image: 'postgres:13.4',
            scale: 1,
            availableReplicas: 1,
            containers: [{ name: 'postgres', image: 'postgres:13.4' }],
          },
        ];
      }

      throw error;
    }
  }

  /**
   * Fetch deployments from Rancher Kubernetes API endpoint and map to RancherWorkload[]
   */
  async getDeploymentsFromK8sApi(
    site: RancherSite,
    clusterId: string,
    namespace: string,
  ): Promise<RancherWorkload[]> {
    const client = axios.create({
      baseURL: `${site.url}/k8s/clusters/${clusterId}`,
      headers: {
        Authorization: `Bearer ${site.token}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
    const endpoint = `/v1/apps.deployments?exclude=metadata.managedFields&namespace=${namespace}`;
    this.logger.debug(
      `Fetching deployments from: ${site.url}/k8s/clusters/${clusterId}${endpoint}`,
    );
    const response = await client.get(endpoint);
    this.logger.debug(
      `Raw deployments response: ${JSON.stringify(response.data).slice(0, 1000)}`,
    );
    let items: any[] = [];
    if (Array.isArray(response.data.items)) {
      items = response.data.items;
    } else if (Array.isArray(response.data.data)) {
      items = response.data.data;
    } else if (Array.isArray(response.data)) {
      items = response.data;
    }
    // Filter by namespace in case Rancher returns all deployments
    items = items.filter((dep: any) => dep.metadata?.namespace === namespace);
    this.logger.debug(
      `Found ${items.length} deployments in response for namespace: ${namespace}`,
    );
    return items.map((dep: any) => ({
      id: dep.metadata?.uid || dep.metadata?.name,
      name: dep.metadata?.name,
      type: 'deployment',
      namespaceId: dep.metadata?.namespace || namespace,
      state:
        dep.status?.conditions?.find((c: any) => c.type === 'Available')
          ?.status === 'True'
          ? 'active'
          : 'inactive',
      image: dep.spec?.template?.spec?.containers?.[0]?.image || '',
      scale: dep.spec?.replicas || 1,
      availableReplicas:
        dep.status?.availableReplicas || dep.status?.readyReplicas || 0,
      containers: dep.spec?.template?.spec?.containers,
    }));
  }

  async getConfigMapsFromK8sApi(
    site: RancherSite,
    clusterId: string,
    namespace: string,
  ): Promise<any[]> {
    const client = axios.create({
      baseURL: `${site.url}/k8s/clusters/${clusterId}`,
      headers: {
        Authorization: `Bearer ${site.token}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    const endpoint = `/v1/configmaps?exclude=metadata.managedFields&namespace=${namespace}`;
    this.logger.debug(
      `Fetching ConfigMaps from: ${site.url}/k8s/clusters/${clusterId}${endpoint}`,
    );

    const response = await client.get(endpoint);
    this.logger.debug(
      `Raw ConfigMaps response: ${JSON.stringify(response.data).slice(0, 1000)}`,
    );

    let items: any[] = [];
    if (Array.isArray(response.data.items)) {
      items = response.data.items;
    } else if (Array.isArray(response.data.data)) {
      items = response.data.data;
    } else if (Array.isArray(response.data)) {
      items = response.data;
    }

    // Filter by namespace in case Rancher returns all ConfigMaps
    items = items.filter((cm: any) => cm.metadata?.namespace === namespace);

    this.logger.debug(
      `Found ${items.length} ConfigMaps in response for namespace: ${namespace}`,
    );

    return items.map((cm: any) => ({
      id: cm.metadata?.uid || cm.metadata?.name,
      name: cm.metadata?.name,
      namespace: cm.metadata?.namespace || namespace,
      data: cm.data || {},
      binaryData: cm.binaryData || {},
      labels: cm.metadata?.labels || {},
      annotations: cm.metadata?.annotations || {},
      creationTimestamp: cm.metadata?.creationTimestamp,
      resourceVersion: cm.metadata?.resourceVersion,
      dataKeys: Object.keys(cm.data || {}),
      dataSize: Object.keys(cm.data || {}).length,
    }));
  }

  async getSecretsFromK8sApi(
    site: RancherSite,
    clusterId: string,
    namespace: string,
  ): Promise<any[]> {
    const client = axios.create({
      baseURL: `${site.url}/k8s/clusters/${clusterId}`,
      headers: {
        Authorization: `Bearer ${site.token}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    const endpoint = `/v1/secrets?exclude=metadata.managedFields&namespace=${namespace}`;
    this.logger.debug(
      `Fetching Secrets from: ${site.url}/k8s/clusters/${clusterId}${endpoint}`,
    );

    const response = await client.get(endpoint);
    this.logger.debug(
      `Raw Secrets response: ${JSON.stringify(response.data).slice(0, 1000)}`,
    );

    let items: any[] = [];
    if (Array.isArray(response.data.items)) {
      items = response.data.items;
    } else if (Array.isArray(response.data.data)) {
      items = response.data.data;
    } else if (Array.isArray(response.data)) {
      items = response.data;
    }

    // Filter by namespace and exclude system secrets
    items = items.filter((secret: any) => {
      const name = secret.metadata?.name || '';
      const type = secret.type || '';
      return (
        secret.metadata?.namespace === namespace &&
        !name.startsWith('default-token-') &&
        type !== 'kubernetes.io/service-account-token' &&
        !name.includes('.dockercfg') &&
        !name.includes('.dockerconfigjson')
      );
    });

    this.logger.debug(
      `Found ${items.length} Secrets in response for namespace: ${namespace}`,
    );

    return items.map((secret: any) => ({
      id: secret.metadata?.uid || secret.metadata?.name,
      name: secret.metadata?.name,
      namespace: secret.metadata?.namespace || namespace,
      type: secret.type || 'Opaque',
      data: secret.data || {},
      labels: secret.metadata?.labels || {},
      annotations: secret.metadata?.annotations || {},
      creationTimestamp: secret.metadata?.creationTimestamp,
      resourceVersion: secret.metadata?.resourceVersion,
      dataKeys: Object.keys(secret.data || {}),
      dataSize: Object.keys(secret.data || {}).length,
    }));
  }

  async updateConfigMapKey(
    site: RancherSite,
    clusterId: string,
    namespace: string,
    configMapName: string,
    key: string,
    value: string,
  ): Promise<any> {
    const client = axios.create({
      baseURL: `${site.url}/k8s/clusters/${clusterId}`,
      headers: {
        Authorization: `Bearer ${site.token}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    // First, get the current ConfigMap
    const getEndpoint = `/v1/configmaps/${namespace}/${configMapName}`;
    this.logger.debug(
      `Getting ConfigMap for update: ${site.url}/k8s/clusters/${clusterId}${getEndpoint}`,
    );

    const getResponse = await client.get(getEndpoint);
    const configMap = getResponse.data;

    // Update the specific key
    if (!configMap.data) {
      configMap.data = {};
    }
    configMap.data[key] = value;

    // Update the ConfigMap
    const putEndpoint = `/v1/configmaps/${namespace}/${configMapName}`;
    this.logger.debug(
      `Updating ConfigMap: ${site.url}/k8s/clusters/${clusterId}${putEndpoint}`,
    );

    const response = await client.put(putEndpoint, configMap);
    this.logger.debug(`ConfigMap key updated successfully: ${key}`);

    return response.data;
  }

  async updateSecretKey(
    site: RancherSite,
    clusterId: string,
    namespace: string,
    secretName: string,
    key: string,
    value: string,
  ): Promise<any> {
    const client = axios.create({
      baseURL: `${site.url}/k8s/clusters/${clusterId}`,
      headers: {
        Authorization: `Bearer ${site.token}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    // First, get the current Secret
    const getEndpoint = `/v1/secrets/${namespace}/${secretName}`;
    this.logger.debug(
      `Getting Secret for update: ${site.url}/k8s/clusters/${clusterId}${getEndpoint}`,
    );

    const getResponse = await client.get(getEndpoint);
    const secret = getResponse.data;

    // Update the specific key
    if (!secret.data) {
      secret.data = {};
    }
    secret.data[key] = value;

    // Update the Secret
    const putEndpoint = `/v1/secrets/${namespace}/${secretName}`;
    this.logger.debug(
      `Updating Secret: ${site.url}/k8s/clusters/${clusterId}${putEndpoint}`,
    );

    const response = await client.put(putEndpoint, secret);
    this.logger.debug(`Secret key updated successfully: ${key}`);

    return response.data;
  }

  async syncSecretKeys(
    site: RancherSite,
    clusterId: string,
    namespace: string,
    secretName: string,
    keys: Record<string, string>,
  ): Promise<any> {
    const client = axios.create({
      baseURL: `${site.url}/k8s/clusters/${clusterId}`,
      headers: {
        Authorization: `Bearer ${site.token}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    // First, get the current Secret
    const getEndpoint = `/v1/secrets/${namespace}/${secretName}`;
    this.logger.debug(
      `Getting Secret for bulk update: ${site.url}/k8s/clusters/${clusterId}${getEndpoint}`,
    );

    const getResponse = await client.get(getEndpoint);
    const secret = getResponse.data;

    // Update multiple keys
    if (!secret.data) {
      secret.data = {};
    }
    Object.assign(secret.data, keys);

    // Update the Secret
    const putEndpoint = `/v1/secrets/${namespace}/${secretName}`;
    this.logger.debug(
      `Updating Secret with ${Object.keys(keys).length} keys: ${site.url}/k8s/clusters/${clusterId}${putEndpoint}`,
    );

    const response = await client.put(putEndpoint, secret);
    this.logger.debug(
      `Secret keys updated successfully: ${Object.keys(keys).join(', ')}`,
    );

    return response.data;
  }

  async syncConfigMapKeys(
    site: RancherSite,
    clusterId: string,
    namespace: string,
    configMapName: string,
    keysToSync: Record<string, string>,
  ): Promise<any> {
    const client = axios.create({
      baseURL: `${site.url}/k8s/clusters/${clusterId}`,
      headers: {
        Authorization: `Bearer ${site.token}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    // First, get the current ConfigMap
    const getEndpoint = `/v1/configmaps/${namespace}/${configMapName}`;
    this.logger.debug(
      `Getting ConfigMap for bulk sync: ${site.url}/k8s/clusters/${clusterId}${getEndpoint}`,
    );

    const getResponse = await client.get(getEndpoint);
    const configMap = getResponse.data;

    // Update multiple keys
    if (!configMap.data) {
      configMap.data = {};
    }

    Object.entries(keysToSync).forEach(([key, value]) => {
      configMap.data[key] = value;
    });

    // Update the ConfigMap
    const putEndpoint = `/v1/configmaps/${namespace}/${configMapName}`;
    this.logger.debug(
      `Bulk updating ConfigMap: ${site.url}/k8s/clusters/${clusterId}${putEndpoint}`,
    );

    const response = await client.put(putEndpoint, configMap);
    this.logger.debug(
      `ConfigMap keys synced successfully: ${Object.keys(keysToSync).join(', ')}`,
    );

    return response.data;
  }

  private mapWorkloadData(
    workload: any,
    expectedType: string | null,
    clusterId: string,
    namespaceId: string,
  ): RancherWorkload {
    // Determine workload type from various sources
    let workloadType = expectedType;
    if (!workloadType) {
      workloadType =
        workload.kind?.toLowerCase() ||
        workload.type?.toLowerCase() ||
        workload.metadata?.labels?.[
          'workload.user.cattle.io/workloadselector'
        ]?.split('-')[0] ||
        'deployment';
    }

    // Normalize type names
    if (workloadType.endsWith('s')) {
      workloadType = workloadType.slice(0, -1);
    }

    const name = workload.metadata?.name || workload.name || 'unknown';
    const namespace =
      workload.metadata?.namespace || workload.namespaceId || namespaceId;

    return {
      id: workload.id || `${clusterId}:${namespace}:${name}-${workloadType}`,
      name,
      type: workloadType,
      namespaceId: namespace,
      state: this.extractWorkloadState(workload),
      image: this.extractImageTag(workload),
      scale: this.extractScale(workload, workloadType),
      availableReplicas: this.extractAvailableReplicas(workload),
      containers: this.extractContainers(workload),
    };
  }

  private extractWorkloadState(workload: any): string {
    // Try different ways to get the state
    if (workload.status?.conditions) {
      const readyCondition = workload.status.conditions.find(
        (c: any) => c.type === 'Ready' || c.type === 'Available',
      );
      if (readyCondition?.status === 'True') return 'active';
      if (readyCondition?.status === 'False') return 'inactive';
    }

    if (workload.status?.phase) {
      return workload.status.phase.toLowerCase();
    }

    if (workload.state) {
      return workload.state;
    }

    // Check if replicas match desired replicas
    const desired = workload.spec?.replicas || workload.scale || 1;
    const available =
      workload.status?.availableReplicas || workload.status?.readyReplicas || 0;

    return available >= desired ? 'active' : 'updating';
  }

  private extractScale(workload: any, type: string): number {
    // DaemonSets don't have replica counts, use node count instead
    if (type === 'daemonset') {
      return (
        workload.status?.desiredNumberScheduled ||
        workload.status?.numberReady ||
        workload.scale ||
        1
      );
    }

    return workload.spec?.replicas || workload.scale || 1;
  }

  private extractAvailableReplicas(workload: any): number {
    return (
      workload.status?.availableReplicas ||
      workload.status?.readyReplicas ||
      workload.status?.numberReady ||
      0
    );
  }

  private extractContainers(workload: any): any[] {
    return (
      workload.spec?.template?.spec?.containers ||
      workload.spec?.containers ||
      workload.containers ||
      []
    );
  }

  async updateWorkloadImage(
    site: RancherSite,
    clusterId: string,
    namespace: string,
    workloadName: string,
    workloadType: string,
    newImageTag: string,
  ): Promise<any> {
    try {
      this.logger.log(
        `Updating ${workloadType} ${workloadName} in ${clusterId}/${namespace} to image ${newImageTag}`,
      );

      // Use Kubernetes API to update the workload directly
      const k8sClient = axios.create({
        baseURL: `${site.url}/k8s/clusters/${clusterId}`,
        headers: {
          Authorization: `Bearer ${site.token}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      });

      // Determine the correct API endpoint based on workload type
      let apiPath: string;
      const apiVersion = 'apps/v1';

      switch (workloadType.toLowerCase()) {
        case 'deployment':
          apiPath = `apis/${apiVersion}/namespaces/${namespace}/deployments/${workloadName}`;
          break;
        case 'daemonset':
          apiPath = `apis/${apiVersion}/namespaces/${namespace}/daemonsets/${workloadName}`;
          break;
        case 'statefulset':
          apiPath = `apis/${apiVersion}/namespaces/${namespace}/statefulsets/${workloadName}`;
          break;
        case 'replicaset':
          apiPath = `apis/${apiVersion}/namespaces/${namespace}/replicasets/${workloadName}`;
          break;
        default:
          // Fallback to deployment if type is unknown
          apiPath = `apis/${apiVersion}/namespaces/${namespace}/deployments/${workloadName}`;
          this.logger.warn(
            `Unknown workload type ${workloadType}, defaulting to deployment`,
          );
      }

      this.logger.debug(`Fetching workload from: ${apiPath}`);

      // Get the current workload
      const getResponse: AxiosResponse = await k8sClient.get(apiPath);
      const workload = getResponse.data;

      this.logger.log(
        `Retrieved ${workloadType} ${workload.metadata?.name} (current image: ${workload.spec?.template?.spec?.containers?.[0]?.image})`,
      );

      // Update the image in the workload spec
      if (
        workload.spec?.template?.spec?.containers &&
        workload.spec.template.spec.containers.length > 0
      ) {
        const oldImage = workload.spec.template.spec.containers[0].image;
        workload.spec.template.spec.containers[0].image = newImageTag;

        this.logger.log(`Updating image from ${oldImage} to ${newImageTag}`);

        // Update the workload
        const updateResponse: AxiosResponse = await k8sClient.put(
          apiPath,
          workload,
        );

        this.logger.log(
          `Successfully updated ${workloadType} ${workloadName} to ${newImageTag}`,
        );
        return updateResponse.data;
      } else {
        throw new Error(
          `No containers found in ${workloadType} ${workloadName}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to update ${workloadType} ${workloadName}: ${error.message}`,
      );
      if (error.response) {
        this.logger.error(
          `Response status: ${error.response.status}, data: ${JSON.stringify(error.response.data)}`,
        );
      }
      throw error;
    }
  }

  private extractImageTag(workload: any): string {
    // Try different possible locations for the image
    if (
      workload.spec?.template?.spec?.containers &&
      workload.spec.template.spec.containers.length > 0
    ) {
      return workload.spec.template.spec.containers[0].image || 'unknown';
    }
    if (workload.spec?.containers && workload.spec.containers.length > 0) {
      return workload.spec.containers[0].image || 'unknown';
    }
    if (workload.containers && workload.containers.length > 0) {
      return workload.containers[0].image || 'unknown';
    }
    return 'unknown';
  }

  clearClient(siteId: string): void {
    this.clients.delete(siteId);
  }

  async testApiStructure(
    site: RancherSite,
  ): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      this.logger.debug(`Testing API structure for site: ${site.name}`);

      const client = this.getClient(site);

      // Test the root endpoint to see what's available
      const rootResponse = await client.get('/');
      this.logger.debug(
        `Root response keys: ${Object.keys(rootResponse.data || {}).join(', ')}`,
      );

      // Test common endpoints
      const endpoints = ['clusters', 'projects', 'workloads', 'namespaces'];
      const availableEndpoints = [];

      for (const endpoint of endpoints) {
        try {
          const response = await client.get(`/${endpoint}`);
          availableEndpoints.push({
            endpoint,
            status: response.status,
            hasData: !!response.data,
            dataKeys: response.data ? Object.keys(response.data) : [],
          });
          this.logger.debug(`Endpoint /${endpoint} is available`);
        } catch (error) {
          this.logger.debug(`Endpoint /${endpoint} failed: ${error.message}`);
        }
      }

      return {
        success: true,
        message: 'API structure test completed',
        data: {
          rootResponse: rootResponse.data,
          availableEndpoints,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `API structure test failed: ${error.message}`,
      };
    }
  }
}
