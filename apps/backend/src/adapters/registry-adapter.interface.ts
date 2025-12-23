export type RegistryType = 'harbor' | 'dockerhub';

export interface RegistryAdapterCapabilities {
  /**
   * True if the registry has a first-class "project" concept (e.g. Harbor).
   * For registries that do not, callers should treat `projectOrNamespace` as a namespace.
   */
  supportsProjects: boolean;

  /**
   * True if the adapter can enumerate all repositories without additional scoping.
   * Many registries cannot do this without authentication and/or a namespace.
   */
  supportsListAllRepositories: boolean;

  /**
   * True if `getTagDetail` can return meaningful digest/size/metadata.
   */
  supportsTagDetail: boolean;
}

export class RegistryOperationNotSupportedError extends Error {
  constructor(message = 'Registry operation not supported') {
    super(message);
    this.name = 'RegistryOperationNotSupportedError';
  }
}

export interface RegistryConnectionTestResult {
  success: boolean;
  message: string;
  data?: any;
}

export interface RegistryProject {
  id?: string | number;
  name: string;
  isPublic?: boolean;
  repoCount?: number;
  raw?: any;
}

export interface RegistryRepository {
  /**
   * Repository short name (without project/namespace prefix if applicable)
   */
  name: string;

  /**
   * Fully qualified name in the registry (e.g. `project/repo` or `namespace/repo`)
   */
  fullName: string;

  description?: string;
  pullCount?: number;
  starCount?: number;
  tagsCount?: number;
  raw?: any;
}

export interface RegistryTag {
  name: string;
  pushedAt?: string;
  pulledAt?: string;
  size?: number;
  digest?: string;
  mediaType?: string;
  raw?: any;
}

export interface RegistryTagDetail {
  name: string;
  digest?: string;
  size?: number;
  pushedAt?: string;
  pulledAt?: string;
  mediaType?: string;
  manifestMediaType?: string;
  annotations?: Record<string, string>;
  labels?: any[];
  /**
   * Optional free-form description or readme-like content.
   * Not standardized across registries; may be undefined.
   */
  readme?: string;
  raw?: any;
}

export interface RegistryRepoRef {
  /**
   * For Harbor: project name.
   * For DockerHub: namespace (e.g. `library`, `myorg`).
   */
  projectOrNamespace?: string;
  repository: string;
}

export interface IRegistryAdapter {
  readonly type: RegistryType;

  capabilities(): RegistryAdapterCapabilities;

  testConnection(): Promise<RegistryConnectionTestResult>;

  /**
   * List projects (Harbor). Adapters that don't support projects should throw.
   */
  listProjects(): Promise<RegistryProject[]>;

  /**
   * List repositories within a project/namespace.
   */
  listRepositories(options: {
    projectOrNamespace: string;
  }): Promise<RegistryRepository[]>;

  /**
   * List all repositories across the registry (only if supported).
   */
  listAllRepositories(): Promise<RegistryRepository[]>;

  /**
   * List tags inside a repository.
   */
  listTags(repo: RegistryRepoRef): Promise<RegistryTag[]>;

  /**
   * Get tag detail (digest/size/metadata). Some registries may have limited data.
   */
  getTagDetail(repo: RegistryRepoRef, tag: string): Promise<RegistryTagDetail>;
}
