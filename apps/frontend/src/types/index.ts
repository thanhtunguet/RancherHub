// Re-export auth types
export * from './auth';
export * from './user';
export * from './message-template';

export interface RancherSite {
  id: string;
  name: string;
  url: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Environment {
  id: string;
  name: string;
  description?: string;
  color: string;
  createdAt: string;
  updatedAt: string;
  appInstances?: AppInstance[];
}

export interface GenericClusterSite {
  id: string;
  name: string;
  clusterName: string | null;
  serverUrl: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AppInstance {
  id: string;
  name: string;
  cluster: string;
  namespace: string;
  clusterType: 'rancher' | 'generic';
  rancherSiteId: string | null;
  genericClusterSiteId: string | null;
  environmentId: string;
  createdAt: string;
  updatedAt: string;
  rancherSite?: RancherSite | null;
  genericClusterSite?: GenericClusterSite | null;
  environment?: Environment;
  services?: Service[];
}

export interface Service {
  id: string;
  name: string;
  appInstanceId: string;
  status: string;
  replicas: number;
  availableReplicas: number;
  imageTag: string;
  workloadType: string;
  lastSynced?: string;
  createdAt: string;
  updatedAt: string;
  appInstance?: AppInstance;
}

export interface SyncOperation {
  id: string;
  sourceEnvironmentId: string;
  targetEnvironmentId: string;
  serviceIds: string[];
  status: string;
  startTime: string;
  endTime?: string;
  initiatedBy: string;
  createdAt: string;
}

export interface SyncHistory {
  id: string;
  syncOperationId: string;
  serviceId: string;
  serviceName?: string;
  workloadType?: string;
  sourceAppInstanceId: string;
  sourceEnvironmentName?: string;
  sourceCluster?: string;
  sourceNamespace?: string;
  targetAppInstanceId: string;
  targetEnvironmentName?: string;
  targetCluster?: string;
  targetNamespace?: string;
  previousImageTag?: string;
  newImageTag: string;
  containerName?: string;
  configChanges?: any;
  status: string;
  error?: string;
  durationMs?: number;
  timestamp: string;
  createdAt: string;
  syncOperation?: SyncOperation;
}

export interface TestConnectionResponse {
  success: boolean;
  message: string;
  data?: any;
}

export interface CreateSiteRequest {
  name: string;
  url: string;
  token: string;
}

export interface CreateEnvironmentRequest {
  name: string;
  description?: string;
  color?: string;
}

export interface CreateAppInstanceRequest {
  name: string;
  cluster: string;
  namespace: string;
  environmentId: string;
  clusterType: 'rancher' | 'generic';
  rancherSiteId?: string;
  genericClusterSiteId?: string;
}

export interface CreateGenericClusterSiteRequest {
  name: string;
  kubeconfig: string;
}

export interface GenericClusterNamespace {
  id: string;
  name: string;
  state: string;
  created: string;
}

export interface SyncServicesRequest {
  sourceEnvironmentId: string;
  targetEnvironmentId: string;
  serviceIds: string[];
  targetAppInstanceIds: string[]; // All selected target app instances (not 1:1 mapped)
}

export interface RancherCluster {
  id: string;
  name: string;
  state: string;
  description?: string;
}

export interface RancherNamespace {
  id: string;
  name: string;
  projectId: string;
  clusterId: string;
}

export interface HarborSite {
  id: string;
  name: string;
  url: string;
  username: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateHarborSiteRequest {
  name: string;
  url: string;
  username: string;
  password: string;
  active?: boolean;
}

export interface TestHarborConnectionRequest {
  url: string;
  username: string;
  password: string;
}

export interface ServiceWithImageSize extends Service {
  imageSize?: number;
  imageSizeFormatted?: string;
  compressedImageSize?: number;
  compressedImageSizeFormatted?: string;
  imageSource?: string;
}

export interface AppInstanceTreeNode {
  id: string;
  name: string;
  appInstances: Array<{
    id: string;
    name: string;
    cluster: string;
    namespace: string;
    rancherSite: {
      id: string;
      name: string;
    };
  }>;
}

export interface ConfigMapData {
  id: string;
  name: string;
  namespace: string;
  data: Record<string, string>;
  binaryData: Record<string, string>;
  labels: Record<string, string>;
  annotations: Record<string, string>;
  creationTimestamp: string;
  resourceVersion: string;
  dataKeys: string[];
  dataSize: number;
  appInstanceId: string;
}

export interface ConfigMapComparison {
  configMapName: string;
  source: ConfigMapData | null;
  target: ConfigMapData | null;
  differences: {
    existence: boolean;
    data: boolean;
    labels: boolean;
    annotations: boolean;
    dataKeys: string[];
    changedKeys: string[];
  };
  status: string;
  differenceType: string;
}

export interface ConfigMapComparisonResult {
  sourceAppInstanceId: string;
  targetAppInstanceId: string;
  summary: {
    totalConfigMaps: number;
    identical: number;
    different: number;
    missingInSource: number;
    missingInTarget: number;
  };
  comparisons: ConfigMapComparison[];
}

export interface ConfigMapKeyComparison {
  key: string;
  sourceValue: string | null;
  targetValue: string | null;
  isDifferent: boolean;
  missingInSource: boolean;
  missingInTarget: boolean;
  identical: boolean;
}

export interface ConfigMapDetailedComparison {
  configMapName: string;
  sourceAppInstanceId: string;
  targetAppInstanceId: string;
  sourceConfigMap: ConfigMapData | null;
  targetConfigMap: ConfigMapData | null;
  keyComparisons: ConfigMapKeyComparison[];
  summary: {
    totalKeys: number;
    identical: number;
    different: number;
    missingInSource: number;
    missingInTarget: number;
  };
}

export interface SecretData {
  id: string;
  name: string;
  namespace: string;
  type: string;
  data?: Record<string, string>;
  dataKeys: string[];
  dataSize: number;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
  creationTimestamp: string;
  resourceVersion: string;
  appInstanceId: string;
}

export interface SecretComparison {
  secretName: string;
  source: SecretData | null;
  target: SecretData | null;
  status: 'identical' | 'different' | 'missing';
  differenceType: 'missing-in-source' | 'missing-in-target' | 'data-different' | 'identical';
  differences: {
    keys: {
      onlyInSource: string[];
      onlyInTarget: string[];
      different: string[];
      identical: string[];
    };
    metadata: {
      labels: any;
      annotations: any;
    };
  };
}

export interface SecretComparisonResult {
  sourceAppInstanceId: string;
  targetAppInstanceId: string;
  summary: {
    totalSecrets: number;
    identical: number;
    different: number;
    missingInSource: number;
    missingInTarget: number;
  };
  comparisons: SecretComparison[];
}

export interface SecretKeyComparison {
  key: string;
  sourceExists: boolean;
  targetExists: boolean;
  isDifferent: boolean;
  missingInSource: boolean;
  missingInTarget: boolean;
  identical: boolean;
}

export interface SecretDetailedComparison {
  secretName: string;
  sourceAppInstanceId: string;
  targetAppInstanceId: string;
  source: SecretData | null;
  target: SecretData | null;
  keyComparisons: SecretKeyComparison[];
  summary: {
    totalKeys: number;
    identical: number;
    different: number;
    missingInSource: number;
    missingInTarget: number;
  };
}

export interface ImageTag {
  name: string;
  pushedAt: string;
  size?: number;
  sizeFormatted?: string;
}

export interface UpdateImageResponse {
  success: boolean;
  message: string;
  service: {
    id: string;
    name: string;
    oldImageTag: string;
    newImageTag: string;
    fullNewImageTag: string;
  };
  rancherResponse?: any;
}

// Harbor API Types
export interface HarborProject {
  project_id: number;
  name: string;
  public: boolean;
  owner_id: number;
  owner_name: string;
  creation_time: string;
  update_time: string;
  deleted: boolean;
  repo_count: number;
  chart_count?: number;
}

export interface HarborRepository {
  id: number;
  name: string;
  project_id: number;
  description: string;
  pull_count: number;
  star_count: number;
  tags_count: number;
  labels: any[];
  creation_time: string;
  update_time: string;
}

export interface HarborTag {
  id: number;
  repository_id: number;
  artifact_id: number;
  name: string;
  push_time: string;
  pull_time: string;
  signed: boolean;
  immutable: boolean;
}

export interface HarborArtifact {
  id: number;
  type: string;
  media_type: string;
  manifest_media_type: string;
  project_id: number;
  repository_id: number;
  digest: string;
  size: number;
  push_time: string;
  pull_time: string;
  extra_attrs?: {
    architecture?: string;
    author?: string;
    config?: {
      Cmd?: string[];
      Entrypoint?: string[];
      Env?: string[];
      ExposedPorts?: { [key: string]: Record<string, never> };
      Labels?: { [key: string]: string };
      User?: string;
      WorkingDir?: string;
    };
    created?: string;
    os?: string;
  };
  annotations?: { [key: string]: string };
  references?: any[];
  tags?: HarborTag[];
  addition_links?: { [key: string]: { absolute: boolean; href: string } };
  labels?: any[];
}

export interface HarborTagDetail {
  name: string;
  digest?: string;
  size?: number;
  pushedAt?: string;
  pulledAt?: string;
  mediaType?: string;
  manifestMediaType?: string;
  annotations?: Record<string, string>;
  labels?: any[];
  readme?: string;
  raw?: any;
}
