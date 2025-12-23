import { Logger } from '@nestjs/common';
import { HarborApiService } from '../services/harbor-api.service';
import { HarborSite } from '../entities/harbor-site.entity';
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

export class HarborRegistryAdapter implements IRegistryAdapter {
  public readonly type = 'harbor' as const;
  private readonly logger = new Logger(HarborRegistryAdapter.name);

  constructor(
    private readonly harborApiService: HarborApiService,
    private readonly harborSite: HarborSite,
  ) {}

  capabilities(): RegistryAdapterCapabilities {
    return {
      supportsProjects: true,
      supportsListAllRepositories: true,
      supportsTagDetail: true,
    };
  }

  async testConnection(): Promise<RegistryConnectionTestResult> {
    try {
      const data = await this.harborApiService.getHealth(this.harborSite);
      return {
        success: true,
        message: 'Connection successful',
        data,
      };
    } catch (error) {
      return {
        success: false,
        message: error?.message || 'Connection failed',
      };
    }
  }

  async listProjects(): Promise<RegistryProject[]> {
    const projects = await this.harborApiService.getProjects(this.harborSite);
    return projects.map((p) => ({
      id: p.project_id,
      name: p.name,
      isPublic: p.public,
      repoCount: p.repo_count,
      raw: p,
    }));
  }

  private stripProjectPrefix(projectName: string, repoName: string): string {
    const prefix = `${projectName}/`;
    return repoName.startsWith(prefix)
      ? repoName.slice(prefix.length)
      : repoName;
  }

  async listRepositories(options: {
    projectOrNamespace: string;
  }): Promise<RegistryRepository[]> {
    const projectName = options?.projectOrNamespace;
    if (!projectName) {
      throw new RegistryOperationNotSupportedError(
        'Harbor requires projectOrNamespace (project name) to list repositories',
      );
    }

    const repos = await this.harborApiService.getRepositories(
      this.harborSite,
      projectName,
    );

    return repos.map((r) => {
      const normalizedName = this.stripProjectPrefix(projectName, r.name);
      return {
        name: normalizedName,
        fullName: `${projectName}/${normalizedName}`,
        description: r.description,
        pullCount: r.pull_count,
        starCount: r.star_count,
        tagsCount: r.tags_count,
        raw: r,
      };
    });
  }

  async listAllRepositories(): Promise<RegistryRepository[]> {
    const projects = await this.listProjects();
    const result: RegistryRepository[] = [];

    for (const project of projects) {
      try {
        const repos = await this.listRepositories({
          projectOrNamespace: project.name,
        });
        result.push(...repos);
      } catch (error) {
        this.logger.warn(
          `Failed to list repositories for Harbor project '${project.name}': ${error?.message || error}`,
        );
      }
    }

    return result;
  }

  async listTags(repo: RegistryRepoRef): Promise<RegistryTag[]> {
    const projectName = repo.projectOrNamespace;
    if (!projectName) {
      throw new RegistryOperationNotSupportedError(
        'Harbor requires projectOrNamespace (project name) to list tags',
      );
    }

    const artifacts = await this.harborApiService.getArtifacts(
      this.harborSite,
      projectName,
      repo.repository,
    );

    const tags: RegistryTag[] = [];
    for (const artifact of artifacts) {
      if (!artifact.tags || artifact.tags.length === 0) continue;

      for (const tag of artifact.tags) {
        tags.push({
          name: tag.name,
          pushedAt: tag.push_time,
          pulledAt: tag.pull_time,
          size: artifact.size,
          digest: artifact.digest,
          mediaType: artifact.media_type,
          raw: { tag, artifact },
        });
      }
    }

    // De-dup by tag name (keep newest pushedAt if available)
    const byName = new Map<string, RegistryTag>();
    for (const t of tags) {
      const existing = byName.get(t.name);
      if (!existing) {
        byName.set(t.name, t);
        continue;
      }

      const existingTime = existing.pushedAt
        ? new Date(existing.pushedAt).getTime()
        : 0;
      const newTime = t.pushedAt ? new Date(t.pushedAt).getTime() : 0;
      if (newTime >= existingTime) byName.set(t.name, t);
    }

    return Array.from(byName.values()).sort((a, b) => {
      const dateA = a.pushedAt ? new Date(a.pushedAt).getTime() : 0;
      const dateB = b.pushedAt ? new Date(b.pushedAt).getTime() : 0;
      return dateB - dateA;
    });
  }

  async getTagDetail(
    repo: RegistryRepoRef,
    tag: string,
  ): Promise<RegistryTagDetail> {
    const projectName = repo.projectOrNamespace;
    if (!projectName) {
      throw new RegistryOperationNotSupportedError(
        'Harbor requires projectOrNamespace (project name) to get tag detail',
      );
    }

    const artifact = await this.harborApiService.getArtifactByTag(
      this.harborSite,
      projectName,
      repo.repository,
      tag,
    );

    if (!artifact) {
      throw new Error(
        `Harbor tag not found: ${projectName}/${repo.repository}:${tag}`,
      );
    }

    return {
      name: tag,
      digest: artifact.digest,
      size: artifact.size,
      pushedAt: artifact.push_time,
      pulledAt: artifact.pull_time,
      mediaType: artifact.media_type,
      manifestMediaType: artifact.manifest_media_type,
      annotations: artifact.annotations,
      labels: artifact.labels,
      raw: artifact,
    };
  }
}
