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

export interface AppInstance {
  id: string;
  name: string;
  cluster: string;
  namespace: string;
  rancherSiteId: string;
  environmentId: string;
  createdAt: string;
  updatedAt: string;
  rancherSite?: RancherSite;
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
  rancherSiteId: string;
  environmentId: string;
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