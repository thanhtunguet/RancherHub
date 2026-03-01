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
      const normalized = url.port
        ? `${url.hostname}:${url.port}`
        : url.hostname;
      return normalized.toLowerCase();
    } catch {
      // Fallback: strip protocol and path
      return trimmed
        .replace(/^https?:\/\//, '')
        .replace(/\/.*$/, '')
        .trim()
        .toLowerCase();
    }
  }

  private getImageRefHost(imageRef: string): string {
    if (!imageRef) return '';
    const firstSlash = imageRef.indexOf('/');
    if (firstSlash === -1) return '';
    return imageRef.substring(0, firstSlash);
  }

  private hasRegistryDomain(host: string): boolean {
    if (!host) return false;
    // Docker distribution reference rule of thumb:
    // first component is a registry if it contains '.' or ':' or equals 'localhost'.
    return host.includes('.') || host.includes(':') || host === 'localhost';
  }

  private hasRegistryDomainAndProject(imageRef: string): boolean {
    if (!imageRef || !imageRef.includes('/')) return false;

    const rawHost = this.getImageRefHost(imageRef);
    const host = this.normalizeHost(rawHost);
    if (!this.hasRegistryDomain(host)) return false;

    let imageWithoutTag = imageRef.split('@')[0];
    const lastColon = imageWithoutTag.lastIndexOf(':');
    const lastSlash = imageWithoutTag.lastIndexOf('/');
    // Only strip ":tag" when ":" is after the last "/"
    if (lastColon > lastSlash) {
      imageWithoutTag = imageWithoutTag.substring(0, lastColon);
    }

    const pathAfterHost = imageWithoutTag.split('/').slice(1).filter(Boolean);

    // Must include both project and repository at minimum:
    // registry.domain/project/repository[:tag]
    return pathAfterHost.length >= 2;
  }

  async createHarborAdapter(siteId: string): Promise<HarborRegistryAdapter> {
    const site = await this.harborSitesService.findOne(siteId);
    return new HarborRegistryAdapter(this.harborApiService, site);
  }

  createDockerHubAdapter(): DockerHubRegistryAdapter {
    return new DockerHubRegistryAdapter(this.dockerHubApiService);
  }

  async createAdapterFromImageRef(imageRef: string): Promise<IRegistryAdapter> {
    // Only route to Harbor for fully-qualified private refs:
    // registry-domain/project/repository[:tag]
    if (!this.hasRegistryDomainAndProject(imageRef)) {
      return this.createDockerHubAdapter();
    }

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
