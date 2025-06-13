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

  async testConnection(site: RancherSite): Promise<{ success: boolean; message: string; data?: any }> {
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

  async getProjects(site: RancherSite, clusterId?: string): Promise<RancherProject[]> {
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

  async getNamespaces(site: RancherSite, clusterId?: string): Promise<RancherNamespace[]> {
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
                this.logger.debug(`Successfully fetched ${namespaces.length} namespaces from endpoint: ${endpoint}`);
                return namespaces.map((namespace: any) => ({
                  id: namespace.id || namespace.metadata?.name || namespace.name,
                  name: namespace.name || namespace.metadata?.name,
                  projectId: namespace.projectId || namespace.metadata?.labels?.['field.cattle.io/projectId'] || '',
                  clusterId: namespace.clusterId || namespace.metadata?.labels?.['field.cattle.io/clusterId'] || clusterId,
                }));
              }
            }
          } catch (endpointError) {
            this.logger.debug(`Endpoint ${endpoint} failed: ${endpointError.message}`);
            continue;
          }
        }

        // Method 2: If direct filtering fails, get projects first, then namespaces from each project
        this.logger.debug(`All direct endpoints failed, trying via projects for cluster: ${clusterId}`);
        try {
          const projects = await this.getProjects(site, clusterId);
          this.logger.debug(`Found ${projects.length} projects for cluster ${clusterId}`);
          
          const allNamespaces: RancherNamespace[] = [];
          
          for (const project of projects) {
            try {
              this.logger.debug(`Fetching namespaces for project: ${project.id}`);
              const projectNamespaces = await client.get(`/namespaces?projectId=${project.id}`);
              if (projectNamespaces.data && projectNamespaces.data.data) {
                const namespaces = projectNamespaces.data.data.map((namespace: any) => ({
                  id: namespace.id,
                  name: namespace.name,
                  projectId: namespace.projectId || project.id,
                  clusterId: namespace.clusterId || clusterId,
                }));
                this.logger.debug(`Found ${namespaces.length} namespaces in project ${project.id}`);
                allNamespaces.push(...namespaces);
              }
            } catch (projectError) {
              this.logger.warn(`Failed to fetch namespaces for project ${project.id}: ${projectError.message}`);
            }
          }
          
          this.logger.debug(`Total namespaces found: ${allNamespaces.length}`);
          return allNamespaces;
        } catch (projectError) {
          this.logger.error(`Failed to fetch namespaces via projects: ${projectError.message}`);
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

  async getWorkloads(site: RancherSite, clusterId: string, namespaceId: string): Promise<RancherWorkload[]> {
    try {
      const client = this.getClient(site);
      const response: AxiosResponse = await client.get(
        `/project/${clusterId}/workloads?namespaceId=${namespaceId}`,
      );
      
      return response.data.data.map((workload: any) => ({
        id: workload.id,
        name: workload.name,
        type: workload.type,
        namespaceId: workload.namespaceId,
        state: workload.state,
        image: this.extractImageTag(workload),
        scale: workload.scale || 1,
        availableReplicas: workload.status?.availableReplicas || 0,
        containers: workload.containers,
      }));
    } catch (error) {
      this.logger.error(`Failed to fetch workloads: ${error.message}`);
      throw error;
    }
  }

  async updateWorkloadImage(
    site: RancherSite,
    workloadId: string,
    newImageTag: string,
  ): Promise<any> {
    try {
      const client = this.getClient(site);
      
      const getResponse: AxiosResponse = await client.get(`/project/${workloadId}`);
      const workload = getResponse.data;
      
      if (workload.containers && workload.containers.length > 0) {
        workload.containers[0].image = newImageTag;
      }
      
      const updateResponse: AxiosResponse = await client.put(
        `/project/${workloadId}`,
        workload,
      );
      
      return updateResponse.data;
    } catch (error) {
      this.logger.error(`Failed to update workload image: ${error.message}`);
      throw error;
    }
  }

  private extractImageTag(workload: any): string {
    if (workload.containers && workload.containers.length > 0) {
      return workload.containers[0].image || 'unknown';
    }
    return 'unknown';
  }

  clearClient(siteId: string): void {
    this.clients.delete(siteId);
  }
}