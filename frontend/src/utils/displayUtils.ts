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
