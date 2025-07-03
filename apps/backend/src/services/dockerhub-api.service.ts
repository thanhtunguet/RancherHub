import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosResponse } from 'axios';

export interface DockerHubTag {
  name: string;
  full_size: number;
  image_id: string;
  repository: number;
  creator: number;
  last_updater: number;
  last_updated: string;
  image_pushed_at: string;
  v2: boolean;
  tag_status: string;
  tag_last_pulled: string;
  tag_last_pushed: string;
  media_type: string;
  digest: string;
}

export interface DockerHubRepository {
  name: string;
  namespace: string;
  repository_type: string;
  status: number;
  description: string;
  is_private: boolean;
  is_automated: boolean;
  can_edit: boolean;
  star_count: number;
  pull_count: number;
  last_updated: string;
  has_starred: boolean;
  full_description: string;
  affiliation: string;
  permissions: {
    read: boolean;
    write: boolean;
    admin: boolean;
  };
}

export interface DockerHubTagsResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: DockerHubTag[];
}

@Injectable()
export class DockerHubApiService {
  private readonly logger = new Logger(DockerHubApiService.name);
  private readonly baseUrl = 'https://hub.docker.com/v2';

  private async makeRequest<T>(endpoint: string, params?: any): Promise<T> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      this.logger.debug(`Making DockerHub API request to: ${url}`);

      const response: AxiosResponse<T> = await axios.get(url, {
        params,
        timeout: 30000,
        headers: {
          'User-Agent': 'RancherHub/1.0.0',
        },
      });

      return response.data;
    } catch (error) {
      this.logger.error(
        `DockerHub API request failed: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to fetch from DockerHub: ${error.message}`);
    }
  }

  async getRepository(
    namespace: string,
    name: string,
  ): Promise<DockerHubRepository> {
    return this.makeRequest<DockerHubRepository>(
      `/repositories/${namespace}/${name}/`,
    );
  }

  async getTags(
    namespace: string,
    name: string,
    page?: number,
    pageSize?: number,
  ): Promise<DockerHubTagsResponse> {
    return this.makeRequest<DockerHubTagsResponse>(
      `/repositories/${namespace}/${name}/tags/`,
      {
        page: page || 1,
        page_size: pageSize || 100,
      },
    );
  }

  async getImageSize(
    fullImageTag: string,
  ): Promise<{ size: number; sizeFormatted: string; source: string } | null> {
    try {
      this.logger.debug(`Getting DockerHub image size for: ${fullImageTag}`);

      const { namespace, repository, tag } =
        this.parseDockerHubImageTag(fullImageTag);

      if (!namespace || !repository) {
        this.logger.warn(
          `Could not parse DockerHub image tag: ${fullImageTag}`,
        );
        return null;
      }

      this.logger.debug(
        `Parsed DockerHub image: namespace=${namespace}, repository=${repository}, tag=${tag}`,
      );

      // Search for the tag across multiple pages
      let tagInfo = null;
      let page = 1;
      const maxPages = 5; // Limit search to first 5 pages to avoid excessive API calls

      while (page <= maxPages && !tagInfo) {
        this.logger.debug(`Searching for tag '${tag}' on page ${page}`);
        
        const tagsResponse = await this.getTags(namespace, repository, page);

        if (!tagsResponse.results || tagsResponse.results.length === 0) {
          this.logger.warn(`No tags found for ${namespace}/${repository} on page ${page}`);
          break;
        }

        // Find the specific tag on this page
        tagInfo = tagsResponse.results.find((t) => t.name === tag);

        if (tagInfo) {
          this.logger.debug(`Found tag '${tag}' on page ${page}`);
          break;
        }

        // Check if there are more pages
        if (!tagsResponse.next) {
          this.logger.debug(`No more pages available after page ${page}`);
          break;
        }

        page++;
      }

      if (!tagInfo) {
        this.logger.warn(
          `Tag '${tag}' not found for ${namespace}/${repository} in first ${maxPages} pages`,
        );
        return null;
      }

      this.logger.debug(
        `Found DockerHub tag with size: ${tagInfo.full_size} bytes`,
      );

      return {
        size: tagInfo.full_size,
        sizeFormatted: this.formatBytes(tagInfo.full_size),
        source: 'DockerHub',
      };
    } catch (error) {
      this.logger.error(
        `Failed to get DockerHub image size for ${fullImageTag}`,
        error.stack,
      );
      return null;
    }
  }

  private parseDockerHubImageTag(imageTag: string): {
    namespace: string;
    repository: string;
    tag: string;
  } {
    try {
      this.logger.debug(`Parsing DockerHub image tag: ${imageTag}`);

      // Remove any registry prefix if present (should not have any for DockerHub)
      let cleanImageTag = imageTag;

      // Handle cases like:
      // - nginx:latest -> library/nginx:latest
      // - ubuntu:20.04 -> library/ubuntu:20.04
      // - postgres -> library/postgres:latest
      // - myuser/myapp:v1.0 -> myuser/myapp:v1.0
      // - myuser/myapp -> myuser/myapp:latest
      // - rabbitmq:3.12-management -> library/rabbitmq:3.12-management

      let imagePart: string;
      let tag: string;

      if (cleanImageTag.includes(':')) {
        const lastColonIndex = cleanImageTag.lastIndexOf(':');
        imagePart = cleanImageTag.substring(0, lastColonIndex);
        tag = cleanImageTag.substring(lastColonIndex + 1);
        
        // Validate that the tag part doesn't look like a port number
        // (e.g., "localhost:5000/myimage" should not be parsed as "localhost" with tag "5000/myimage")
        if (tag.includes('/')) {
          // This might be a registry with port, treat as no tag
          imagePart = cleanImageTag;
          tag = 'latest';
        }
      } else {
        imagePart = cleanImageTag;
        tag = 'latest';
      }

      let namespace: string;
      let repository: string;

      if (imagePart.includes('/')) {
        const parts = imagePart.split('/');
        namespace = parts[0];
        repository = parts.slice(1).join('/');
      } else {
        // Official images are in the 'library' namespace
        namespace = 'library';
        repository = imagePart;
      }

      const result = { namespace, repository, tag };
      this.logger.debug(`Parsed DockerHub result: ${JSON.stringify(result)}`);
      return result;
    } catch (error) {
      this.logger.error(
        `Error parsing DockerHub image tag: ${imageTag}`,
        error,
      );
      return { namespace: '', repository: '', tag: 'latest' };
    }
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  isDockerHubImage(imageTag: string): boolean {
    // DockerHub images typically don't have a registry domain prefix
    // or they are simple names like "nginx", "ubuntu", "user/repo"

    // Skip if it contains a domain (has dots and looks like a URL)
    if (imageTag.includes('.') && imageTag.includes('/')) {
      const firstPart = imageTag.split('/')[0];
      // Check if it looks like a domain (has dots and TLD-like structure)
      if (firstPart.includes('.') && /\.[a-z]{2,}/.test(firstPart)) {
        return false;
      }
    }

    // DockerHub patterns:
    // - Simple names: nginx, ubuntu, postgres
    // - User/org repos: user/repo, organization/app
    // - NOT: registry.domain.com/path, harbor.example.com/project/repo
    return true;
  }
}
