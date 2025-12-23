import { Logger } from '@nestjs/common';
import * as k8s from '@kubernetes/client-node';
import { IClusterAdapter } from './cluster-adapter.interface';
import {
  RancherNamespace,
  RancherWorkload,
} from '../services/rancher-api.service';

/**
 * Adapter for generic Kubernetes clusters (EKS, GKE, AKS, vanilla K8s)
 * Uses direct Kubernetes API access via kubeconfig
 */
export class GenericClusterAdapter implements IClusterAdapter {
  private readonly logger = new Logger(GenericClusterAdapter.name);
  private readonly kc: k8s.KubeConfig;
  private readonly k8sApi: k8s.CoreV1Api;
  private readonly appsApi: k8s.AppsV1Api;
  private readonly clusterName: string;

  constructor(kubeconfig: string, clusterName: string) {
    this.kc = new k8s.KubeConfig();
    try {
      this.kc.loadFromString(kubeconfig);
      this.clusterName = clusterName;
      this.k8sApi = this.kc.makeApiClient(k8s.CoreV1Api);
      this.appsApi = this.kc.makeApiClient(k8s.AppsV1Api);
    } catch (error) {
      this.logger.error(
        `Failed to initialize Kubernetes client: ${error.message}`,
      );
      throw error;
    }
  }

  async testConnection(): Promise<{
    success: boolean;
    message: string;
    data?: any;
  }> {
    try {
      const response = await this.k8sApi.listNamespace();
      return {
        success: true,
        message: 'Connection successful',
        data: {
          clusterName: this.clusterName,
          namespacesCount: response.items?.length || 0,
          kubernetesVersion: 'Unknown',
        },
      };
    } catch (error) {
      this.logger.error(`Connection test failed: ${error.message}`);
      return {
        success: false,
        message: `Connection failed: ${error.message}`,
      };
    }
  }

  async getNamespaces(clusterId?: string): Promise<RancherNamespace[]> {
    // clusterId is ignored for generic clusters (single cluster per site)
    void clusterId;
    try {
      const response = await this.k8sApi.listNamespace();
      return (response.items || []).map((ns) => ({
        id: ns.metadata?.name || '',
        name: ns.metadata?.name || '',
        projectId: '', // Not applicable for generic clusters
        clusterId: this.clusterName,
      }));
    } catch (error) {
      this.logger.error(`Failed to list namespaces: ${error.message}`);
      throw error;
    }
  }

  async getDeployments(
    clusterId: string,
    namespace: string,
  ): Promise<RancherWorkload[]> {
    try {
      // Get all workload types
      const deployments = await this.appsApi.listNamespacedDeployment({
        namespace,
      });
      const daemonSets = await this.appsApi.listNamespacedDaemonSet({
        namespace,
      });
      const statefulSets = await this.appsApi.listNamespacedStatefulSet({
        namespace,
      });

      const workloads: RancherWorkload[] = [];

      // Process Deployments
      for (const dep of deployments.items || []) {
        workloads.push({
          id: dep.metadata?.uid || dep.metadata?.name || '',
          name: dep.metadata?.name || '',
          type: 'deployment',
          namespaceId: namespace,
          state:
            dep.status?.conditions?.find((c) => c.type === 'Available')
              ?.status === 'True'
              ? 'active'
              : 'inactive',
          image: dep.spec?.template?.spec?.containers?.[0]?.image || '',
          scale: dep.spec?.replicas || 0,
          availableReplicas: dep.status?.availableReplicas || 0,
          containers: dep.spec?.template?.spec?.containers || [],
        });
      }

      // Process DaemonSets
      for (const ds of daemonSets.items || []) {
        workloads.push({
          id: ds.metadata?.uid || ds.metadata?.name || '',
          name: ds.metadata?.name || '',
          type: 'daemonset',
          namespaceId: namespace,
          state:
            ds.status?.numberReady === ds.status?.desiredNumberScheduled
              ? 'active'
              : 'inactive',
          image: ds.spec?.template?.spec?.containers?.[0]?.image || '',
          scale: ds.status?.desiredNumberScheduled || 0,
          availableReplicas: ds.status?.numberReady || 0,
          containers: ds.spec?.template?.spec?.containers || [],
        });
      }

      // Process StatefulSets
      for (const ss of statefulSets.items || []) {
        workloads.push({
          id: ss.metadata?.uid || ss.metadata?.name || '',
          name: ss.metadata?.name || '',
          type: 'statefulset',
          namespaceId: namespace,
          state:
            ss.status?.readyReplicas === ss.spec?.replicas
              ? 'active'
              : 'inactive',
          image: ss.spec?.template?.spec?.containers?.[0]?.image || '',
          scale: ss.spec?.replicas || 0,
          availableReplicas: ss.status?.readyReplicas || 0,
          containers: ss.spec?.template?.spec?.containers || [],
        });
      }

      return workloads;
    } catch (error) {
      this.logger.error(
        `Failed to get deployments from namespace ${namespace}: ${error.message}`,
      );
      throw error;
    }
  }

  async updateWorkloadImage(
    clusterId: string,
    namespace: string,
    workloadName: string,
    workloadType: string,
    newImageTag: string,
  ): Promise<any> {
    try {
      const normalizedType = workloadType.toLowerCase().replace(/s$/, ''); // Remove trailing 's'

      switch (normalizedType) {
        case 'deployment':
          return await this.updateDeploymentImage(
            namespace,
            workloadName,
            newImageTag,
          );
        case 'daemonset':
          return await this.updateDaemonSetImage(
            namespace,
            workloadName,
            newImageTag,
          );
        case 'statefulset':
          return await this.updateStatefulSetImage(
            namespace,
            workloadName,
            newImageTag,
          );
        default:
          throw new Error(`Unsupported workload type: ${workloadType}`);
      }
    } catch (error) {
      this.logger.error(`Failed to update workload image: ${error.message}`);
      throw error;
    }
  }

  private async updateDeploymentImage(
    namespace: string,
    name: string,
    newImageTag: string,
  ): Promise<any> {
    const deployment = await this.appsApi.readNamespacedDeployment({
      name,
      namespace,
    });
    if (deployment.spec?.template?.spec?.containers?.[0]) {
      deployment.spec.template.spec.containers[0].image = newImageTag;
    }
    return this.appsApi.replaceNamespacedDeployment({
      name,
      namespace,
      body: deployment,
    });
  }

  private async updateDaemonSetImage(
    namespace: string,
    name: string,
    newImageTag: string,
  ): Promise<any> {
    const daemonSet = await this.appsApi.readNamespacedDaemonSet({
      name,
      namespace,
    });
    if (daemonSet.spec?.template?.spec?.containers?.[0]) {
      daemonSet.spec.template.spec.containers[0].image = newImageTag;
    }
    return this.appsApi.replaceNamespacedDaemonSet({
      name,
      namespace,
      body: daemonSet,
    });
  }

  private async updateStatefulSetImage(
    namespace: string,
    name: string,
    newImageTag: string,
  ): Promise<any> {
    const statefulSet = await this.appsApi.readNamespacedStatefulSet({
      name,
      namespace,
    });
    if (statefulSet.spec?.template?.spec?.containers?.[0]) {
      statefulSet.spec.template.spec.containers[0].image = newImageTag;
    }
    return this.appsApi.replaceNamespacedStatefulSet({
      name,
      namespace,
      body: statefulSet,
    });
  }

  async getConfigMaps(clusterId: string, namespace: string): Promise<any[]> {
    try {
      const response = await this.k8sApi.listNamespacedConfigMap({
        namespace,
      });
      return (response.items || []).map((cm) => ({
        id: cm.metadata?.uid || cm.metadata?.name || '',
        name: cm.metadata?.name || '',
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
    } catch (error) {
      this.logger.error(
        `Failed to get ConfigMaps from namespace ${namespace}: ${error.message}`,
      );
      throw error;
    }
  }

  async updateConfigMapKey(
    clusterId: string,
    namespace: string,
    configMapName: string,
    key: string,
    value: string,
  ): Promise<any> {
    try {
      const configMap = await this.k8sApi.readNamespacedConfigMap({
        name: configMapName,
        namespace,
      });
      if (!configMap.data) {
        configMap.data = {};
      }
      configMap.data[key] = value;
      return this.k8sApi.replaceNamespacedConfigMap({
        name: configMapName,
        namespace,
        body: configMap,
      });
    } catch (error) {
      this.logger.error(`Failed to update ConfigMap key: ${error.message}`);
      throw error;
    }
  }

  async syncConfigMapKeys(
    clusterId: string,
    namespace: string,
    configMapName: string,
    keys: Record<string, string>,
  ): Promise<any> {
    try {
      const configMap = await this.k8sApi.readNamespacedConfigMap({
        name: configMapName,
        namespace,
      });
      if (!configMap.data) {
        configMap.data = {};
      }
      // Update multiple keys
      for (const [key, value] of Object.entries(keys)) {
        configMap.data[key] = value;
      }
      return this.k8sApi.replaceNamespacedConfigMap({
        name: configMapName,
        namespace,
        body: configMap,
      });
    } catch (error) {
      this.logger.error(`Failed to sync ConfigMap keys: ${error.message}`);
      throw error;
    }
  }

  async getSecrets(clusterId: string, namespace: string): Promise<any[]> {
    try {
      const response = await this.k8sApi.listNamespacedSecret({ namespace });
      // Filter out system secrets (same logic as RancherApiService)
      return (response.items || [])
        .filter((secret) => {
          const name = secret.metadata?.name || '';
          const type = secret.type || '';
          // Filter out service account tokens and docker config secrets
          return !(
            type === 'kubernetes.io/service-account-token' ||
            type === 'kubernetes.io/dockercfg' ||
            type === 'kubernetes.io/dockerconfigjson' ||
            name.startsWith('default-token-')
          );
        })
        .map((secret) => ({
          id: secret.metadata?.uid || secret.metadata?.name || '',
          name: secret.metadata?.name || '',
          namespace: secret.metadata?.namespace || namespace,
          type: secret.type,
          data: secret.data || {},
          labels: secret.metadata?.labels || {},
          annotations: secret.metadata?.annotations || {},
          creationTimestamp: secret.metadata?.creationTimestamp,
          resourceVersion: secret.metadata?.resourceVersion,
          dataKeys: Object.keys(secret.data || {}),
          dataSize: Object.keys(secret.data || {}).length,
        }));
    } catch (error) {
      this.logger.error(
        `Failed to get Secrets from namespace ${namespace}: ${error.message}`,
      );
      throw error;
    }
  }

  async updateSecretKey(
    clusterId: string,
    namespace: string,
    secretName: string,
    key: string,
    value: string,
  ): Promise<any> {
    try {
      const secret = await this.k8sApi.readNamespacedSecret({
        name: secretName,
        namespace,
      });
      if (!secret.data) {
        secret.data = {};
      }
      // Base64 encode the value (Kubernetes stores secrets as base64)
      secret.data[key] = Buffer.from(value).toString('base64');
      return this.k8sApi.replaceNamespacedSecret({
        name: secretName,
        namespace,
        body: secret,
      });
    } catch (error) {
      this.logger.error(`Failed to update Secret key: ${error.message}`);
      throw error;
    }
  }

  async syncSecretKeys(
    clusterId: string,
    namespace: string,
    secretName: string,
    keys: Record<string, string>,
  ): Promise<any> {
    try {
      const secret = await this.k8sApi.readNamespacedSecret({
        name: secretName,
        namespace,
      });
      if (!secret.data) {
        secret.data = {};
      }
      // Update multiple keys (base64 encode all values)
      for (const [key, value] of Object.entries(keys)) {
        secret.data[key] = Buffer.from(value).toString('base64');
      }
      return this.k8sApi.replaceNamespacedSecret({
        name: secretName,
        namespace,
        body: secret,
      });
    } catch (error) {
      this.logger.error(`Failed to sync Secret keys: ${error.message}`);
      throw error;
    }
  }
}
