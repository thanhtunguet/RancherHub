import { Injectable, Logger } from '@nestjs/common';
import { HarborSite } from '../entities/harbor-site.entity';
import axios, { AxiosError, AxiosResponse } from 'axios';

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
      ExposedPorts?: { [key: string]: {} };
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

@Injectable()
export class HarborApiService {
  private readonly logger = new Logger(HarborApiService.name);
  private readonly resolvedBaseUrls = new Map<string, string>();

  private getSiteCacheKey(harborSite: HarborSite): string {
    return harborSite.id || harborSite.url;
  }

  private normalizeEndpoint(endpoint: string): string {
    return endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  }

  private buildApiBaseOptions(rootBase: string): string[] {
    const trimmedRoot = rootBase.replace(/\/+$/, '');
    const options: string[] = [];

    if (trimmedRoot.endsWith('/api/v2.0')) {
      options.push(trimmedRoot);
    } else if (trimmedRoot.endsWith('/api')) {
      options.push(`${trimmedRoot}/v2.0`);
    } else {
      options.push(`${trimmedRoot}/api/v2.0`);
    }

    return options;
  }

  private getBaseUrlCandidates(harborSite: HarborSite): string[] {
    const trimmedBase = harborSite.url.replace(/\/+$/, '');
    const rootCandidates: string[] = [trimmedBase];

    const candidates: string[] = [];
    const seen = new Set<string>();

    for (const root of rootCandidates) {
      for (const option of this.buildApiBaseOptions(root)) {
        if (!seen.has(option)) {
          candidates.push(option);
          seen.add(option);
        }
      }
    }

    return candidates;
  }

  private encodeProjectName(projectName: string): string {
    return encodeURIComponent(projectName);
  }

  private encodeRepositoryName(repositoryName: string): string {
    const onceEncoded = encodeURIComponent(repositoryName);
    return repositoryName.includes('/') ? encodeURIComponent(onceEncoded) : onceEncoded;
  }

  private getAuthHeader(harborSite: HarborSite): string {
    return `Basic ${Buffer.from(`${harborSite.username}:${harborSite.password}`).toString('base64')}`;
  }

  private async makeRequest<T>(
    harborSite: HarborSite,
    endpoint: string,
    params?: any,
  ): Promise<T> {
    const cacheKey = this.getSiteCacheKey(harborSite);
    const endpointPath = this.normalizeEndpoint(endpoint);

    let baseCandidates = this.getBaseUrlCandidates(harborSite);
    if (this.resolvedBaseUrls.has(cacheKey)) {
      const cached = this.resolvedBaseUrls.get(cacheKey)!;
      baseCandidates = [cached, ...baseCandidates.filter((candidate) => candidate !== cached)];
    }

    let lastError: AxiosError | null = null;

    for (let index = 0; index < baseCandidates.length; index++) {
      const baseUrl = baseCandidates[index];
      const url = `${baseUrl}${endpointPath}`;

      try {
        this.logger.debug(
          `Harbor API GET ${url} params=${JSON.stringify(params || {})} (candidate ${index + 1}/${baseCandidates.length})`,
        );

        const response: AxiosResponse<T> = await axios.get(url, {
          headers: {
            Authorization: this.getAuthHeader(harborSite),
            'Content-Type': 'application/json',
          },
          params,
          timeout: 30000,
        });

        this.resolvedBaseUrls.set(cacheKey, baseUrl);
        return response.data;
      } catch (error) {
        const axiosError = error as AxiosError;
        lastError = axiosError;
        const status = axiosError.response?.status;
        const statusText = axiosError.response?.statusText;
        const responseData = axiosError.response?.data;

        this.logger.error(
          `Harbor API request failed (${status} ${statusText}) for ${url}: ${axiosError.message}`,
          axiosError.stack,
        );

        if (
          index < baseCandidates.length - 1 &&
          status &&
          (status === 404 || status === 405 || status === 400)
        ) {
          this.logger.warn(
            `Retrying Harbor API request with next base candidate due to ${status}. Response body: ${JSON.stringify(
              responseData,
            )}`,
          );
          continue;
        }

        throw new Error(
          `Failed to fetch from Harbor (${status ?? 'unknown status'}): ${axiosError.message}`,
        );
      }
    }

    if (lastError) {
      throw new Error(
        `Failed to fetch from Harbor (${lastError.response?.status ?? 'unknown status'}): ${lastError.message}`,
      );
    }

    throw new Error('Failed to fetch from Harbor: no base URL candidates succeeded');
  }

  async getProjects(harborSite: HarborSite): Promise<HarborProject[]> {
    return this.makeRequest<HarborProject[]>(harborSite, '/projects');
  }

  async getRepositories(
    harborSite: HarborSite,
    projectName: string,
  ): Promise<HarborRepository[]> {
    const encodedProjectName = this.encodeProjectName(projectName);
    return this.makeRequest<HarborRepository[]>(
      harborSite,
      `/projects/${encodedProjectName}/repositories`,
    );
  }

  async getArtifacts(
    harborSite: HarborSite,
    projectName: string,
    repositoryName: string,
  ): Promise<HarborArtifact[]> {
    const encodedProjectName = this.encodeProjectName(projectName);
    const encodedRepoName = this.encodeRepositoryName(repositoryName);
    return this.makeRequest<HarborArtifact[]>(
      harborSite,
      `/projects/${encodedProjectName}/repositories/${encodedRepoName}/artifacts`,
      {
        with_tag: true,
        with_label: true,
        with_scan_overview: false,
        with_signature: false,
        with_immutable_status: false,
        with_accessory: false,
      },
    );
  }

  async getArtifactManifest(
    harborSite: HarborSite,
    projectName: string,
    repositoryName: string,
    reference: string,
  ): Promise<any> {
    const encodedProjectName = this.encodeProjectName(projectName);
    const encodedRepoName = this.encodeRepositoryName(repositoryName);
    const encodedReference = encodeURIComponent(reference);
    return this.makeRequest<any>(
      harborSite,
      `/projects/${encodedProjectName}/repositories/${encodedRepoName}/artifacts/${encodedReference}/addition/build_history`,
    );
  }

  async getArtifactLayers(
    harborSite: HarborSite,
    projectName: string,
    repositoryName: string,
    reference: string,
  ): Promise<any> {
    const encodedProjectName = this.encodeProjectName(projectName);
    const encodedRepoName = this.encodeRepositoryName(repositoryName);
    const encodedReference = encodeURIComponent(reference);
    
    try {
      // Try to get the manifest to understand the image structure
      const manifest = await this.makeRequest<any>(
        harborSite,
        `/projects/${encodedProjectName}/repositories/${encodedRepoName}/artifacts/${encodedReference}`,
        {
          with_tag: true,
          with_label: false,
          with_scan_overview: false,
          with_signature: false,
          with_immutable_status: false,
          with_accessory: false,
        },
      );

      // If it's a manifest list (multi-platform image), get the first platform
      if (manifest.manifest_media_type === 'application/vnd.docker.distribution.manifest.list.v2+json' ||
          manifest.manifest_media_type === 'application/vnd.oci.image.index.v1+json') {
        this.logger.debug(`Multi-platform image detected for ${projectName}/${repositoryName}:${reference}`);
        
        // Get references (different platform manifests)
        const references = await this.makeRequest<any[]>(
          harborSite,
          `/projects/${encodedProjectName}/repositories/${encodedRepoName}/artifacts/${encodedReference}/references`,
        );

        if (references && references.length > 0) {
          // Use the first available platform (usually amd64)
          const platformManifest = references[0];
          this.logger.debug(`Using platform manifest: ${platformManifest.digest}`);
          
          return await this.makeRequest<any>(
            harborSite,
            `/projects/${encodedProjectName}/repositories/${encodedRepoName}/artifacts/${encodeURIComponent(platformManifest.digest)}`,
            {
              with_tag: true,
              with_label: false,
              with_scan_overview: false,
              with_signature: false,
              with_immutable_status: false,
              with_accessory: false,
            },
          );
        }
      }

      return manifest;
    } catch (error) {
      this.logger.error(`Failed to get artifact layers for ${projectName}/${repositoryName}:${reference}`, error.stack);
      throw error;
    }
  }

  async getArtifactByTag(
    harborSite: HarborSite,
    projectName: string,
    repositoryName: string,
    tag: string
  ): Promise<HarborArtifact | null> {
    const encodedProjectName = this.encodeProjectName(projectName);
    const encodedRepoName = this.encodeRepositoryName(repositoryName);
    const encodedTag = encodeURIComponent(tag);
    try {
      return await this.makeRequest<HarborArtifact>(
        harborSite,
        `/projects/${encodedProjectName}/repositories/${encodedRepoName}/artifacts/${encodedTag}`,
        {
          with_tag: true,
          with_label: true,
          with_scan_overview: false,
          with_signature: false,
          with_immutable_status: false,
          with_accessory: false,
        }
      );
    } catch (error) {
      this.logger.warn(`No artifact found with tag '${tag}' for ${projectName}/${repositoryName}: ${error.message}`);
      return null;
    }
  }

  async getImageSize(
    harborSite: HarborSite,
    fullImageTag: string,
  ): Promise<{ size: number; sizeFormatted: string; compressedSize?: number; compressedSizeFormatted?: string } | null> {
    try {
      this.logger.debug(`Getting image size for: ${fullImageTag} from Harbor: ${harborSite.url}`);
      
      // Parse the full image tag: <siteDomain>/<project>/<repository>:<tag>
      const { projectName, repositoryName, tag } = this.parseImageTag(fullImageTag, harborSite.url);
      
      if (!projectName || !repositoryName) {
        this.logger.warn(`Could not parse image tag: ${fullImageTag}`);
        return null;
      }

      this.logger.debug(`Parsed image tag: project=${projectName}, repository=${repositoryName}, tag=${tag}`);

      // Fetch artifact by tag directly
      const artifact = await this.getArtifactByTag(harborSite, projectName, repositoryName, tag);
      if (!artifact) {
        this.logger.warn(`No artifact found with tag '${tag}' for ${fullImageTag}`);
        return null;
      }

      this.logger.debug(`Found artifact with compressed size: ${artifact.size} bytes`);

      // Try to get the actual uncompressed size by examining the manifest/layers
      try {
        const detailedArtifact = await this.getArtifactLayers(harborSite, projectName, repositoryName, artifact.digest);
        
        // Calculate total uncompressed size from extra_attrs if available
        let uncompressedSize = artifact.size; // Fallback to compressed size
        
        if (detailedArtifact?.extra_attrs?.config?.Size) {
          // Docker image config often contains the total size
          uncompressedSize = detailedArtifact.extra_attrs.config.Size;
          this.logger.debug(`Found uncompressed size from config: ${uncompressedSize} bytes`);
        } else if (detailedArtifact?.extra_attrs?.config?.RootFS?.DiffIDs) {
          // Try to estimate from layer information if available
          // This is an approximation - real uncompressed size would need layer blob analysis
          uncompressedSize = Math.round(artifact.size * 2.5); // Typical compression ratio estimate
          this.logger.debug(`Estimated uncompressed size: ${uncompressedSize} bytes (estimated from compression ratio)`);
        }

        return {
          size: uncompressedSize,
          sizeFormatted: this.formatBytes(uncompressedSize),
          compressedSize: artifact.size,
          compressedSizeFormatted: this.formatBytes(artifact.size),
        };
      } catch (detailError) {
        this.logger.warn(`Could not get detailed size information, using compressed size: ${detailError.message}`);
        
        // If we can't get detailed info, estimate the uncompressed size
        // Docker images typically have a compression ratio of 2-3x
        const estimatedUncompressedSize = Math.round(artifact.size * 2.5);
        
        return {
          size: estimatedUncompressedSize,
          sizeFormatted: this.formatBytes(estimatedUncompressedSize) + ' (estimated)',
          compressedSize: artifact.size,
          compressedSizeFormatted: this.formatBytes(artifact.size),
        };
      }
    } catch (error) {
      this.logger.error(`Failed to get image size for ${fullImageTag}`, error.stack);
      return null;
    }
  }

  private parseImageTag(fullImageTag: string, harborUrl: string): { projectName: string; repositoryName: string; tag: string } {
    try {
      this.logger.debug(`Parsing image tag: ${fullImageTag} with Harbor URL: ${harborUrl}`);
      
      // Remove protocol from Harbor URL for comparison
      const harborDomain = harborUrl.replace(/^https?:\/\//, '');
      this.logger.debug(`Harbor domain: ${harborDomain}`);
      
      // Split image tag by ':'
      let imagePart: string;
      let tag: string;
      
      if (fullImageTag.includes(':')) {
        const lastColonIndex = fullImageTag.lastIndexOf(':');
        imagePart = fullImageTag.substring(0, lastColonIndex);
        tag = fullImageTag.substring(lastColonIndex + 1);
      } else {
        imagePart = fullImageTag;
        tag = 'latest';
      }
      
      this.logger.debug(`Image part: ${imagePart}, tag: ${tag}`);

      // Remove harbor domain if present
      if (imagePart.startsWith(harborDomain + '/')) {
        imagePart = imagePart.substring(harborDomain.length + 1);
        this.logger.debug(`Removed harbor domain, new image part: ${imagePart}`);
      }

      // Split by '/' to get project and repository
      const parts = imagePart.split('/');
      this.logger.debug(`Split parts: ${JSON.stringify(parts)}`);
      
      let result: { projectName: string; repositoryName: string; tag: string };
      
      if (parts.length < 2) {
        // If only one part, assume it's repository in 'library' project
        result = {
          projectName: 'library',
          repositoryName: parts[0],
          tag: tag,
        };
      } else {
        // First part is project, rest is repository
        result = {
          projectName: parts[0],
          repositoryName: parts.slice(1).join('/'),
          tag: tag,
        };
      }
      
      this.logger.debug(`Parsed result: ${JSON.stringify(result)}`);
      return result;
    } catch (error) {
      this.logger.error(`Error parsing image tag: ${fullImageTag}`, error);
      return { projectName: '', repositoryName: '', tag: 'latest' };
    }
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async searchImages(
    harborSite: HarborSite,
    query: string,
  ): Promise<Array<{ name: string; size?: number; tags: string[] }>> {
    try {
      const projects = await this.getProjects(harborSite);
      const results: Array<{ name: string; size?: number; tags: string[] }> = [];

      for (const project of projects) {
        try {
          const repositories = await this.getRepositories(harborSite, project.name);
          
          for (const repo of repositories) {
            const fullImageName = `${project.name}/${repo.name}`;
            
            if (fullImageName.toLowerCase().includes(query.toLowerCase())) {
              try {
                const artifacts = await this.getArtifacts(harborSite, project.name, repo.name);
                const tags = artifacts.flatMap(a => a.tags?.map(t => t.name) || []);
                const totalSize = artifacts.reduce((sum, a) => sum + (a.size || 0), 0);
                
                results.push({
                  name: fullImageName,
                  size: totalSize > 0 ? totalSize : undefined,
                  tags: [...new Set(tags)], // Remove duplicates
                });
              } catch (artifactError) {
                this.logger.warn(`Failed to get artifacts for ${fullImageName}`, artifactError.message);
                results.push({
                  name: fullImageName,
                  tags: [],
                });
              }
            }
          }
        } catch (repoError) {
          this.logger.warn(`Failed to get repositories for project ${project.name}`, repoError.message);
        }
      }

      return results;
    } catch (error) {
      this.logger.error(`Failed to search images with query: ${query}`, error.stack);
      throw new Error(`Failed to search Harbor images: ${error.message}`);
    }
  }
}
