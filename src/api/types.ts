// ==================== Auth ====================
export interface LoginDto {
  username: string;
  password: string;
  twoFactorToken?: string;
  deviceFingerprint?: string;
  deviceName?: string;
  userAgent?: string;
  trustDevice?: boolean;
}

export interface RegisterDto {
  username: string;
  email: string;
  password: string;
}

export interface Verify2FADto {
  token: string;
}

export interface Disable2FADto {
  token: string;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

export interface AuthResponse {
  access_token?: string;
  requires2FA?: boolean;
  requiresTwoFactor?: boolean;
  tempToken?: string;
  message?: string;
  user?: UserProfile;
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  twoFactorEnabled?: boolean;
  isFirstLogin?: boolean;
  active?: boolean;
  createdAt?: string;
}

export interface TwoFASetupResponse {
  qrCode: string;
  secret: string;
}

// ==================== Trusted Devices ====================
export interface TrustedDevice {
  id: string;
  deviceName: string;
  ipAddress: string;
  lastUsedAt: string;
  expiresAt: string;
  createdAt: string;
  isCurrentDevice: boolean;
}

// ==================== Sites ====================
export interface CreateSiteDto {
  name: string;
  url: string;
  token: string;
}

export interface UpdateSiteDto {
  name?: string;
  url?: string;
  token?: string;
}

export interface Site {
  id: string;
  name: string;
  url: string;
  hasToken?: boolean;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface TestConnectionResponse {
  success: boolean;
  message: string;
  data?: Record<string, unknown>;
}

// ==================== Generic Clusters ====================
export interface CreateGenericClusterSiteDto {
  name: string;
  kubeconfig: string;
}

export interface UpdateGenericClusterSiteDto {
  name?: string;
  kubeconfig?: string;
}

export interface GenericCluster {
  id: string;
  name: string;
  hasKubeconfig?: boolean;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// ==================== Harbor Sites ====================
export interface CreateHarborSiteDto {
  name: string;
  url: string;
  username: string;
  password: string;
  active?: boolean;
}

export interface UpdateHarborSiteDto {
  name?: string;
  url?: string;
  username?: string;
  password?: string;
  active?: boolean;
}

export interface TestHarborConnectionDto {
  url: string;
  username: string;
  password: string;
}

export interface HarborSite {
  id: string;
  name: string;
  url: string;
  username: string;
  hasPassword?: boolean;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// ==================== Environments ====================
export interface CreateEnvironmentDto {
  name: string;
  description?: string;
  color: string;
}

export interface UpdateEnvironmentDto {
  name?: string;
  description?: string;
  color?: string;
}

export interface Environment {
  id: string;
  name: string;
  description?: string;
  color: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface EnvironmentWithInstances extends Environment {
  appInstances: AppInstance[];
}

// ==================== App Instances ====================
export interface CreateAppInstanceDto {
  name: string;
  cluster: string;
  namespace: string;
  clusterType: 'rancher' | 'generic';
  rancherSiteId?: string;
  genericClusterSiteId?: string;
  environmentId: string;
}

export interface UpdateAppInstanceDto {
  name?: string;
  cluster?: string;
  namespace?: string;
  clusterType?: 'rancher' | 'generic';
  rancherSiteId?: string;
  genericClusterSiteId?: string;
  environmentId?: string;
}

export interface AppInstance {
  id: string;
  name: string;
  cluster: string;
  namespace: string;
  clusterType: 'rancher' | 'generic';
  rancherSiteId?: string;
  genericClusterSiteId?: string;
  environmentId: string;
  environment?: Environment;
  rancherSite?: Site;
  createdAt?: string;
  updatedAt?: string;
}

// ==================== Services ====================
export interface Service {
  id: string;
  name: string;
  workloadType?: string;
  imageRepo?: string;
  imageTag?: string;
  fullImage?: string;
  status?: string;
  replicas?: number;
  availableReplicas?: number;
  appInstanceId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ServiceWithImageSize extends Service {
  imageSize?: number;
  imageSizeFormatted?: string;
  compressedImageSize?: number;
  compressedImageSizeFormatted?: string;
  imageSource?: string | null;
}

export interface ImageTag {
  name: string;
  pushedAt?: string;
  size?: number;
  sizeFormatted?: string;
}

export interface SyncServicesDto {
  sourceEnvironmentId: string;
  targetEnvironmentId: string;
  serviceIds: string[];
  targetAppInstanceIds: string[];
}

export interface ComparisonSummary {
  totalServices?: number;
  totalConfigMaps?: number;
  totalSecrets?: number;
  identical: number;
  different: number;
  missingInSource: number;
  missingInTarget: number;
}

export interface ServiceComparison {
  serviceName: string;
  workloadType?: string;
  source: Record<string, unknown> | null;
  target: Record<string, unknown> | null;
  differences: Record<string, unknown>;
  status: 'identical' | 'different' | 'missing';
}

export interface CompareResult {
  sourceEnvironmentId?: string;
  targetEnvironmentId?: string;
  sourceAppInstanceId?: string;
  targetAppInstanceId?: string;
  summary: ComparisonSummary;
  comparisons: ServiceComparison[];
}

export interface AppInstanceTreeItem {
  id: string;
  name: string;
  appInstances: {
    id: string;
    name: string;
    cluster: string;
    namespace: string;
    rancherSite: { id: string | null; name: string | null };
  }[];
}

export interface SyncHistoryEntry {
  id: string;
  type?: string;
  sourceEnvironmentId?: string;
  targetEnvironmentId?: string;
  serviceIds?: string[];
  status?: string;
  userId?: string;
  user?: { username: string };
  createdAt?: string;
  details?: Record<string, unknown>;
}

// ==================== ConfigMaps ====================
export interface ConfigMap {
  name: string;
  data?: Record<string, string>;
  namespace?: string;
}

export interface ConfigMapComparison {
  configMapName: string;
  source: Record<string, unknown> | null;
  target: Record<string, unknown> | null;
  differences: Record<string, unknown>;
  status: 'identical' | 'different' | 'missing';
}

export interface ConfigMapCompareResult {
  sourceAppInstanceId: string;
  targetAppInstanceId: string;
  summary: ComparisonSummary;
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

export interface ConfigMapDetailResult {
  configMapName: string;
  sourceAppInstanceId: string;
  targetAppInstanceId: string;
  sourceConfigMap: ConfigMap | null;
  targetConfigMap: ConfigMap | null;
  keyComparisons: ConfigMapKeyComparison[];
  summary: {
    totalKeys: number;
    identical: number;
    different: number;
    missingInSource: number;
    missingInTarget: number;
  };
}

export interface SyncConfigMapKeyDto {
  sourceAppInstanceId: string;
  targetAppInstanceId: string;
  configMapName: string;
  key: string;
  value: string;
}

export interface SyncConfigMapKeysDto {
  sourceAppInstanceId: string;
  targetAppInstanceId: string;
  configMapName: string;
  keys: Record<string, string>;
}

// ==================== Secrets ====================
export interface Secret {
  name: string;
  type?: string;
  namespace?: string;
  data?: Record<string, string>;
  dataKeys?: string[];
  keys?: string[];
}

export interface SecretComparison {
  secretName: string;
  source: Record<string, unknown> | null;
  target: Record<string, unknown> | null;
  differences: Record<string, unknown>;
  status: 'identical' | 'different' | 'missing';
}

export interface SecretCompareResult {
  sourceAppInstanceId: string;
  targetAppInstanceId: string;
  summary: ComparisonSummary;
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

export interface SecretDetailResult {
  secretName: string;
  sourceAppInstanceId: string;
  targetAppInstanceId: string;
  source: Secret | null;
  target: Secret | null;
  keyComparisons: SecretKeyComparison[];
  summary: {
    totalKeys: number;
    identical: number;
    different: number;
    missingInSource: number;
    missingInTarget: number;
  };
}

export interface SyncSecretKeyDto {
  sourceAppInstanceId: string;
  targetAppInstanceId: string;
  secretName: string;
  key: string;
  value: string;
}

export interface SyncSecretKeysDto {
  sourceAppInstanceId: string;
  targetAppInstanceId: string;
  secretName: string;
  keys: Record<string, string>;
}

// ==================== Users ====================
export interface CreateUserDto {
  username: string;
  email: string;
  password: string;
  adminTwoFactorToken: string;
}

export interface UpdateUserDto {
  username?: string;
  email?: string;
  password?: string;
  active?: boolean;
  adminTwoFactorToken: string;
}

export interface DeleteUserDto {
  adminTwoFactorToken: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  active: boolean;
  twoFactorEnabled?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserStats {
  total: number;
  active: number;
  inactive: number;
  twoFactorEnabled: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ==================== Monitoring ====================
export interface CreateMonitoringConfigDto {
  telegramBotToken?: string;
  telegramChatId?: string;
  proxyHost?: string;
  proxyPort?: number;
  proxyUsername?: string;
  proxyPassword?: string;
  monitoringEnabled: boolean;
  alertThreshold: number;
  notificationSchedule: 'immediate' | 'hourly' | 'daily';
  taggedUsers?: string[];
}

export type UpdateMonitoringConfigDto = Partial<CreateMonitoringConfigDto>;

export interface TestTelegramConnectionDto {
  telegramBotToken?: string;
  telegramChatId?: string;
  proxyHost?: string;
  proxyPort?: number;
  proxyUsername?: string;
  proxyPassword?: string;
  taggedUsers?: string[];
}

export interface MonitoringConfig {
  id?: string;
  hasTelegramBotToken?: boolean;
  telegramChatId?: string;
  proxyHost?: string;
  proxyPort?: number;
  proxyUsername?: string;
  hasProxyPassword?: boolean;
  monitoringEnabled: boolean;
  alertThreshold: number;
  notificationSchedule: string;
  taggedUsers?: string[];
}

export interface MonitoredInstance {
  id: string;
  appInstanceId: string;
  monitoringEnabled: boolean;
  checkIntervalMinutes: number;
  appInstance?: AppInstance;
  lastCheckTime?: string;
  lastStatus?: string;
  consecutiveFailures?: number;
}

export interface CreateMonitoredInstanceDto {
  appInstanceId: string;
  monitoringEnabled: boolean;
  checkIntervalMinutes: number;
}

export interface UpdateMonitoredInstanceDto {
  appInstanceId?: string;
  monitoringEnabled?: boolean;
  checkIntervalMinutes?: number;
}

export interface MonitoringAlert {
  id: string;
  instanceId?: string;
  message?: string;
  resolved?: boolean;
  createdAt?: string;
  resolvedAt?: string;
}

export interface MonitoringHistoryEntry {
  id: string;
  monitoredInstanceId: string;
  checkTime: string;
  status: string;
  responseTimeMs: number;
  servicesCount: number;
  healthyServices: number;
  failedServices: number;
  pausedServices: number;
  details?: string;
  error?: string;
  createdAt?: string;
}

// ==================== Message Templates ====================
export interface CreateMessageTemplateDto {
  templateType: 'test_connection' | 'daily_health_check' | 'critical_alert';
  templateName: string;
  messageTemplate: string;
  description?: string;
}

export interface UpdateMessageTemplateDto {
  templateName?: string;
  messageTemplate?: string;
  description?: string;
  isActive?: boolean;
}

export interface PreviewTemplateDto {
  templateType: string;
  messageTemplate: string;
  sampleData?: Record<string, unknown>;
}

export interface MessageTemplate {
  id: string;
  templateType: string;
  templateName: string;
  messageTemplate: string;
  description?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// ==================== Health ====================
export interface HealthStatus {
  status: string;
  [key: string]: unknown;
}
