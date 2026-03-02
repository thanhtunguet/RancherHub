/**
 * Kubernetes resource name validation utility.
 *
 * Kubernetes uses RFC 1123 DNS subdomain rules for most resource names
 * (namespaces, ConfigMaps, Secrets, Deployments, etc.):
 *   - lowercase alphanumeric characters, '-', or '.'
 *   - must start and end with an alphanumeric character
 *   - max 253 characters
 *
 * Applying this validation to all path parameters used in outbound Rancher /
 * Kubernetes API URLs prevents path-traversal attacks (e.g. namespace values
 * like "prod/../kube-system" or "../../../etc/passwd").
 */

const K8S_NAME_RE = /^[a-z0-9]([a-z0-9\-.]{0,251}[a-z0-9])?$/;

/**
 * Assert that a Kubernetes resource name is safe to embed in a URL path.
 * Throws a plain Error (not an HTTP exception) so it can be used in service
 * and adapter layers without importing NestJS HTTP primitives.
 *
 * @param value The name to validate.
 * @param label A human-readable label used in the error message (e.g. "namespace").
 */
export function assertValidK8sName(value: string, label: string): void {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Kubernetes ${label} must be a non-empty string`);
  }
  if (!K8S_NAME_RE.test(value)) {
    throw new Error(
      `Invalid Kubernetes resource name for '${label}': "${value}". ` +
        `Must be lowercase alphanumeric with hyphens/dots only, ` +
        `start and end with alphanumeric, and be at most 253 characters.`,
    );
  }
}
