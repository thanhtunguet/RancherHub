import { Logger } from '@nestjs/common';
import { DockerHubApiService } from '../services/dockerhub-api.service';
import {
  IRegistryAdapter,
  RegistryAdapterCapabilities,
  RegistryConnectionTestResult,
  RegistryOperationNotSupportedError,
  RegistryProject,
  RegistryRepository,
  RegistryRepoRef,
  RegistryTag,
  RegistryTagDetail,
} from './registry-adapter.interface';

export class DockerHubRegistryAdapter implements IRegistryAdapter {
  public readonly type = 'dockerhub' as const;
  private readonly logger = new Logger(DockerHubRegistryAdapter.name);

  constructor(private readonly dockerHubApiService: DockerHubApiService) {}

  capabilities(): RegistryAdapterCapabilities {
    return {
      supportsProjects: false,
      supportsListAllRepositories: false,
      supportsTagDetail: true,
    };
  }

  async testConnection(): Promise<RegistryConnectionTestResult> {
    try {
      // Lightweight sanity check against a well-known public repository.
      await this.dockerHubApiService.getTags('library', 'nginx', 1, 1);
      return { success: true, message: 'Connection successful' };
    } catch (error) {
      return {
        success: false,
        message: error?.message || 'Connection failed',
      };
    }
  }

  async listProjects(): Promise<RegistryProject[]> {
    throw new RegistryOperationNotSupportedError(
      'DockerHub does not support listing projects via this adapter (no first-class project concept)',
    );
  }

  async listRepositories(): Promise<RegistryRepository[]> {
    // DockerHub requires a namespace and an endpoint for listing repositories, which we do not currently implement.
    throw new RegistryOperationNotSupportedError(
      'DockerHub repository listing is not supported (requires namespace-scoped listing API)',
    );
  }

  async listAllRepositories(): Promise<RegistryRepository[]> {
    throw new RegistryOperationNotSupportedError(
      'DockerHub does not support listing all repositories via this adapter',
    );
  }

  async listTags(repo: RegistryRepoRef): Promise<RegistryTag[]> {
    const namespace = repo.projectOrNamespace;
    if (!namespace) {
      throw new RegistryOperationNotSupportedError(
        'DockerHub requires projectOrNamespace (namespace) to list tags',
      );
    }

    const res = await this.dockerHubApiService.getTags(
      namespace,
      repo.repository,
      1,
      100,
    );

    if (!res?.results) return [];

    return res.results
      .map((t) => ({
        name: t.name,
        pushedAt: t.tag_last_pushed || t.last_updated,
        pulledAt: t.tag_last_pulled,
        size: t.full_size,
        digest: t.digest,
        mediaType: t.media_type,
        raw: t,
      }))
      .sort((a, b) => {
        const dateA = a.pushedAt ? new Date(a.pushedAt).getTime() : 0;
        const dateB = b.pushedAt ? new Date(b.pushedAt).getTime() : 0;
        return dateB - dateA;
      });
  }

  async getTagDetail(
    repo: RegistryRepoRef,
    tag: string,
  ): Promise<RegistryTagDetail> {
    const namespace = repo.projectOrNamespace;
    if (!namespace) {
      throw new RegistryOperationNotSupportedError(
        'DockerHub requires projectOrNamespace (namespace) to get tag detail',
      );
    }

    // Search for the tag across multiple pages (similar to DockerHubApiService.getImageSize)
    let page = 1;
    const maxPages = 5;

    while (page <= maxPages) {
      this.logger.debug(
        `Searching DockerHub tag '${tag}' for ${namespace}/${repo.repository} on page ${page}`,
      );

      const res = await this.dockerHubApiService.getTags(
        namespace,
        repo.repository,
        page,
        100,
      );

      const found = res?.results?.find((t) => t.name === tag);
      if (found) {
        return {
          name: found.name,
          digest: found.digest,
          size: found.full_size,
          pushedAt: found.tag_last_pushed || found.last_updated,
          pulledAt: found.tag_last_pulled,
          mediaType: found.media_type,
          raw: found,
        };
      }

      if (!res?.next) break;
      page++;
    }

    throw new Error(
      `DockerHub tag not found: ${namespace}/${repo.repository}:${tag}`,
    );
  }
}
