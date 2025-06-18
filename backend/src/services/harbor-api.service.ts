import { Injectable, Logger } from '@nestjs/common';
import { HarborSite } from '../entities/harbor-site.entity';
import axios, { AxiosResponse } from 'axios';

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

  private getAuthHeader(harborSite: HarborSite): string {
    return `Basic ${Buffer.from(`${harborSite.username}:${harborSite.password}`).toString('base64')}`;
  }

  private async makeRequest<T>(
    harborSite: HarborSite,
    endpoint: string,
    params?: any,
  ): Promise<T> {
    try {
      const url = `${harborSite.url}/api/v2.0${endpoint}`;
      const response: AxiosResponse<T> = await axios.get(url, {
        headers: {
          Authorization: this.getAuthHeader(harborSite),
          'Content-Type': 'application/json',
        },
        params,
        timeout: 30000,
      });

      return response.data;
    } catch (error) {
      this.logger.error(`Harbor API request failed: ${error.message}`, error.stack);
      throw new Error(`Failed to fetch from Harbor: ${error.message}`);
    }
  }

  async getProjects(harborSite: HarborSite): Promise<HarborProject[]> {
    return this.makeRequest<HarborProject[]>(harborSite, '/projects');
  }

  async getRepositories(
    harborSite: HarborSite,
    projectName: string,
  ): Promise<HarborRepository[]> {
    return this.makeRequest<HarborRepository[]>(
      harborSite,
      `/projects/${projectName}/repositories`,
    );
  }

  async getArtifacts(
    harborSite: HarborSite,
    projectName: string,
    repositoryName: string,
  ): Promise<HarborArtifact[]> {
    const encodedRepoName = encodeURIComponent(repositoryName);
    return this.makeRequest<HarborArtifact[]>(
      harborSite,
      `/projects/${projectName}/repositories/${encodedRepoName}/artifacts`,
      {
        with_tag: true,
        with_label: true,
        with_scan_overview: false,
        with_signature: false,
        with_immutable_status: false,
      },
    );
  }

  async getImageSize(
    harborSite: HarborSite,
    imageName: string,
    tag: string = 'latest',
  ): Promise<{ size: number; sizeFormatted: string } | null> {
    try {
      const parts = imageName.split('/');
      let projectName: string;
      let repositoryName: string;

      if (parts.length === 1) {
        projectName = 'library';
        repositoryName = parts[0];
      } else if (parts.length === 2) {
        projectName = parts[0];
        repositoryName = parts[1];
      } else {
        projectName = parts[0];
        repositoryName = parts.slice(1).join('/');
      }

      const artifacts = await this.getArtifacts(harborSite, projectName, repositoryName);
      
      const artifact = artifacts.find(a => 
        a.tags?.some(t => t.name === tag) || 
        (tag === 'latest' && a.tags?.some(t => t.name === 'latest'))
      );

      if (artifact && artifact.size) {
        return {
          size: artifact.size,
          sizeFormatted: this.formatBytes(artifact.size),
        };
      }

      return null;
    } catch (error) {
      this.logger.error(`Failed to get image size for ${imageName}:${tag}`, error.stack);
      return null;
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