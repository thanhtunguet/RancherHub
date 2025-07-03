/**
 * Utility functions for displaying formatted data across components
 */

/**
 * Get readable cluster name from cluster ID
 * @param cluster - Cluster ID (e.g., "c-local", "c-dev")
 * @returns Formatted cluster name
 */
export const getClusterDisplayName = (cluster?: string): string => {
  if (!cluster) return "Unknown";
  // Extract name from cluster ID (e.g., "c-local" -> "local", "c-dev" -> "dev")
  const match = cluster.match(/^(c\-\w+)$/);
  return match ? match[1] : cluster;
};

/**
 * Extract version from image tag (part after colon)
 * @param imageTag - Full image tag (e.g., "nginx:1.21.0", "app:abc123def456")
 * @returns Formatted version string
 */
export const getImageVersion = (imageTag?: string): string => {
  if (!imageTag) return "";
  const parts = imageTag.split(":");
  const version = parts.length > 1 ? parts[parts.length - 1] : imageTag;

  // Check if version is a hash (SHA1/MD5) and truncate to 7 characters
  const hashPattern = /^[a-fA-F0-9]{32,40}$/; // Matches 32-40 hex characters
  return hashPattern.test(version) ? version.substring(0, 7) : version;
};

/**
 * Format app instance display name from app instance ID
 * @param appInstanceId - App instance ID
 * @param appInstancesCache - Cache map of app instances
 * @returns Formatted app instance name or fallback
 */
export const getAppInstanceName = (
  appInstanceId: string,
  appInstancesCache?: Map<string, any>
): string => {
  if (appInstancesCache) {
    const instance = appInstancesCache.get(appInstanceId);
    if (instance?.name) return instance.name;
  }
  return `Instance-${appInstanceId.slice(-8)}`;
};

/**
 * Format app instance display as name/cluster/namespace
 * @param appInstanceName - App instance name
 * @param cluster - Cluster name/ID
 * @param namespace - Namespace name
 * @returns Formatted display string
 */
export const formatAppInstanceDisplay = (
  appInstanceName: string,
  cluster?: string,
  namespace?: string
): string => {
  const clusterDisplay = getClusterDisplayName(cluster);
  return `${appInstanceName}/${clusterDisplay}/${namespace || "N/A"}`;
};

/**
 * Format app instance display from cached instance data
 * @param appInstanceId - App instance ID
 * @param cluster - Cluster name/ID
 * @param namespace - Namespace name
 * @param appInstancesCache - Cache map of app instances
 * @returns Formatted display string
 */
export const formatAppInstanceDisplayWithCache = (
  appInstanceId: string,
  cluster?: string,
  namespace?: string,
  appInstancesCache?: Map<string, any>
): string => {
  const appInstanceName = getAppInstanceName(appInstanceId, appInstancesCache);
  return formatAppInstanceDisplay(appInstanceName, cluster, namespace);
};
