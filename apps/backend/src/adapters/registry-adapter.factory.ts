import { Injectable } from '@nestjs/common';
import { HarborApiService } from '../services/harbor-api.service';
import { DockerHubApiService } from '../services/dockerhub-api.service';
import { HarborSitesService } from '../modules/harbor-sites/harbor-sites.service';
import { HarborRegistryAdapter } from './harbor-registry.adapter';
import { DockerHubRegistryAdapter } from './dockerhub-registry.adapter';
import { IRegistryAdapter } from './registry-adapter.interface';

@Injectable()
export class RegistryAdapterFactory {
  constructor(
    private readonly harborSitesService: HarborSitesService,
    private readonly harborApiService: HarborApiService,
    private readonly dockerHubApiService: DockerHubApiService,
  ) {}

  private normalizeHost(input: string): string {
    if (!input) return '';
    const trimmed = input.trim();

    try {
      // Ensure we have a protocol for URL parsing
      const url = trimmed.includes('://')
        ? new URL(trimmed)
        : new URL(`https://${trimmed}`);
      // Include port if present
      return url.port ? `${url.hostname}:${url.port}` : url.hostname;
    } catch {
      // Fallback: strip protocol and path
      return trimmed
        .replace(/^https?:\/\//, '')
        .replace(/\/.*$/, '')
        .trim();
    }
  }

  private getImageRefHost(imageRef: string): string {
    if (!imageRef) return '';
    const firstSlash = imageRef.indexOf('/');
    if (firstSlash === -1) return '';
    return imageRef.substring(0, firstSlash);
  }

  async createHarborAdapter(siteId: string): Promise<HarborRegistryAdapter> {
    const site = await this.harborSitesService.findOne(siteId);
    return new HarborRegistryAdapter(this.harborApiService, site);
  }

  createDockerHubAdapter(): DockerHubRegistryAdapter {
    return new DockerHubRegistryAdapter(this.dockerHubApiService);
  }

  async createAdapterFromImageRef(imageRef: string): Promise<IRegistryAdapter> {
    const host = this.normalizeHost(this.getImageRefHost(imageRef));
    if (!host) {
      return this.createDockerHubAdapter();
    }

    const harborSites = await this.harborSitesService.findAll();
    for (const site of harborSites) {
      const siteHost = this.normalizeHost(site.url);
      if (siteHost && siteHost === host) {
        return new HarborRegistryAdapter(this.harborApiService, site);
      }
    }

    return this.createDockerHubAdapter();
  }
}
