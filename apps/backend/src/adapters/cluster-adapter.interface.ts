import {
  RancherNamespace,
  RancherWorkload,
} from '../services/rancher-api.service';

export interface IClusterAdapter {
  /**
   * Test connection to the cluster
   */
  testConnection(): Promise<{
    success: boolean;
    message: string;
    data?: any;
  }>;

  /**
   * Get namespaces from the cluster
   * @param clusterId - Optional cluster ID (used by Rancher, ignored by generic clusters)
   */
  getNamespaces(clusterId?: string): Promise<RancherNamespace[]>;

  /**
   * Get deployments from a namespace
   * @param clusterId - Cluster ID
   * @param namespace - Namespace name
   */
  getDeployments(
    clusterId: string,
    namespace: string,
  ): Promise<RancherWorkload[]>;

  /**
   * Update workload image
   * @param clusterId - Cluster ID
   * @param namespace - Namespace name
   * @param workloadName - Name of the workload
   * @param workloadType - Type of workload (deployment, daemonset, etc.)
   * @param newImageTag - New image tag to set
   */
  updateWorkloadImage(
    clusterId: string,
    namespace: string,
    workloadName: string,
    workloadType: string,
    newImageTag: string,
  ): Promise<any>;

  /**
   * Get ConfigMaps from a namespace
   * @param clusterId - Cluster ID
   * @param namespace - Namespace name
   */
  getConfigMaps(clusterId: string, namespace: string): Promise<any[]>;

  /**
   * Update a single ConfigMap key
   * @param clusterId - Cluster ID
   * @param namespace - Namespace name
   * @param configMapName - ConfigMap name
   * @param key - Key to update
   * @param value - New value
   */
  updateConfigMapKey(
    clusterId: string,
    namespace: string,
    configMapName: string,
    key: string,
    value: string,
  ): Promise<any>;

  /**
   * Sync multiple ConfigMap keys
   * @param clusterId - Cluster ID
   * @param namespace - Namespace name
   * @param configMapName - ConfigMap name
   * @param keys - Object with key-value pairs to sync
   */
  syncConfigMapKeys(
    clusterId: string,
    namespace: string,
    configMapName: string,
    keys: Record<string, string>,
  ): Promise<any>;

  /**
   * Get Secrets from a namespace
   * @param clusterId - Cluster ID
   * @param namespace - Namespace name
   */
  getSecrets(clusterId: string, namespace: string): Promise<any[]>;

  /**
   * Update a single Secret key
   * @param clusterId - Cluster ID
   * @param namespace - Namespace name
   * @param secretName - Secret name
   * @param key - Key to update
   * @param value - New value
   */
  updateSecretKey(
    clusterId: string,
    namespace: string,
    secretName: string,
    key: string,
    value: string,
  ): Promise<any>;

  /**
   * Sync multiple Secret keys
   * @param clusterId - Cluster ID
   * @param namespace - Namespace name
   * @param secretName - Secret name
   * @param keys - Object with key-value pairs to sync
   */
  syncSecretKeys(
    clusterId: string,
    namespace: string,
    secretName: string,
    keys: Record<string, string>,
  ): Promise<any>;
}
