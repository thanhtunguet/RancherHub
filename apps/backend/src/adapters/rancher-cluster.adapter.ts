import { Injectable, Logger } from '@nestjs/common';
import { IClusterAdapter } from './cluster-adapter.interface';
import {
  RancherApiService,
  RancherNamespace,
  RancherWorkload,
} from '../services/rancher-api.service';
import { RancherSite } from '../entities/rancher-site.entity';

/**
 * Adapter for Rancher-managed clusters
 * This is a thin wrapper around the existing RancherApiService
 */
@Injectable()
export class RancherClusterAdapter implements IClusterAdapter {
  private readonly logger = new Logger(RancherClusterAdapter.name);

  constructor(
    private readonly rancherApiService: RancherApiService,
    private readonly rancherSite: RancherSite,
  ) {}

  async testConnection(): Promise<{
    success: boolean;
    message: string;
    data?: any;
  }> {
    return this.rancherApiService.testConnection(this.rancherSite);
  }

  async getNamespaces(clusterId?: string): Promise<RancherNamespace[]> {
    return this.rancherApiService.getNamespaces(this.rancherSite, clusterId);
  }

  async getDeployments(
    clusterId: string,
    namespace: string,
  ): Promise<RancherWorkload[]> {
    return this.rancherApiService.getDeploymentsFromK8sApi(
      this.rancherSite,
      clusterId,
      namespace,
    );
  }

  async updateWorkloadImage(
    clusterId: string,
    namespace: string,
    workloadName: string,
    workloadType: string,
    newImageTag: string,
  ): Promise<any> {
    return this.rancherApiService.updateWorkloadImage(
      this.rancherSite,
      clusterId,
      namespace,
      workloadName,
      workloadType,
      newImageTag,
    );
  }

  async getConfigMaps(clusterId: string, namespace: string): Promise<any[]> {
    return this.rancherApiService.getConfigMapsFromK8sApi(
      this.rancherSite,
      clusterId,
      namespace,
    );
  }

  async updateConfigMapKey(
    clusterId: string,
    namespace: string,
    configMapName: string,
    key: string,
    value: string,
  ): Promise<any> {
    return this.rancherApiService.updateConfigMapKey(
      this.rancherSite,
      clusterId,
      namespace,
      configMapName,
      key,
      value,
    );
  }

  async syncConfigMapKeys(
    clusterId: string,
    namespace: string,
    configMapName: string,
    keys: Record<string, string>,
  ): Promise<any> {
    return this.rancherApiService.syncConfigMapKeys(
      this.rancherSite,
      clusterId,
      namespace,
      configMapName,
      keys,
    );
  }

  async getSecrets(clusterId: string, namespace: string): Promise<any[]> {
    return this.rancherApiService.getSecretsFromK8sApi(
      this.rancherSite,
      clusterId,
      namespace,
    );
  }

  async updateSecretKey(
    clusterId: string,
    namespace: string,
    secretName: string,
    key: string,
    value: string,
  ): Promise<any> {
    return this.rancherApiService.updateSecretKey(
      this.rancherSite,
      clusterId,
      namespace,
      secretName,
      key,
      value,
    );
  }

  async syncSecretKeys(
    clusterId: string,
    namespace: string,
    secretName: string,
    keys: Record<string, string>,
  ): Promise<any> {
    return this.rancherApiService.syncSecretKeys(
      this.rancherSite,
      clusterId,
      namespace,
      secretName,
      keys,
    );
  }
}
