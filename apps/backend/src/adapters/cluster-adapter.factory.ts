import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IClusterAdapter } from './cluster-adapter.interface';
import { RancherClusterAdapter } from './rancher-cluster.adapter';
import { GenericClusterAdapter } from './generic-cluster.adapter';
import { RancherSite, GenericClusterSite, AppInstance } from '../entities';
import { RancherApiService } from '../services/rancher-api.service';

/**
 * Factory for creating cluster adapters based on cluster type
 */
@Injectable()
export class ClusterAdapterFactory {
  private readonly logger = new Logger(ClusterAdapterFactory.name);

  constructor(
    @InjectRepository(RancherSite)
    private readonly rancherSiteRepository: Repository<RancherSite>,
    @InjectRepository(GenericClusterSite)
    private readonly genericClusterSiteRepository: Repository<GenericClusterSite>,
    private readonly rancherApiService: RancherApiService,
  ) {}

  /**
   * Create an adapter for the given app instance
   * @param appInstance - App instance with loaded cluster site relation
   */
  async createAdapter(appInstance: AppInstance): Promise<IClusterAdapter> {
    if (appInstance.clusterType === 'rancher') {
      return this.createRancherAdapter(appInstance);
    }

    if (appInstance.clusterType === 'generic') {
      return this.createGenericAdapter(appInstance);
    }

    throw new Error(`Unknown cluster type: ${appInstance.clusterType}`);
  }

  /**
   * Create an adapter directly from a site (used for site-level operations)
   * @param siteType - Type of site ('rancher' or 'generic')
   * @param siteId - Site ID
   */
  async createAdapterFromSite(
    siteType: 'rancher' | 'generic',
    siteId: string,
  ): Promise<IClusterAdapter> {
    if (siteType === 'rancher') {
      const site = await this.rancherSiteRepository.findOne({
        where: { id: siteId },
      });
      if (!site) {
        throw new NotFoundException('Rancher site not found');
      }
      return new RancherClusterAdapter(this.rancherApiService, site);
    }

    if (siteType === 'generic') {
      const site = await this.genericClusterSiteRepository.findOne({
        where: { id: siteId },
      });
      if (!site) {
        throw new NotFoundException('Generic cluster site not found');
      }
      // TODO: Decrypt kubeconfig before passing to adapter
      return new GenericClusterAdapter(site.kubeconfig, site.clusterName);
    }

    throw new Error(`Unknown site type: ${siteType}`);
  }

  /**
   * Create Rancher adapter
   */
  private async createRancherAdapter(
    appInstance: AppInstance,
  ): Promise<RancherClusterAdapter> {
    if (!appInstance.rancherSite) {
      // Load site if not already loaded
      const site = await this.rancherSiteRepository.findOne({
        where: { id: appInstance.rancherSiteId },
      });
      if (!site) {
        throw new NotFoundException(
          `Rancher site not found for app instance ${appInstance.id}`,
        );
      }
      return new RancherClusterAdapter(this.rancherApiService, site);
    }

    return new RancherClusterAdapter(
      this.rancherApiService,
      appInstance.rancherSite,
    );
  }

  /**
   * Create generic cluster adapter
   */
  private async createGenericAdapter(
    appInstance: AppInstance,
  ): Promise<GenericClusterAdapter> {
    if (!appInstance.genericClusterSite) {
      // Load site if not already loaded
      const site = await this.genericClusterSiteRepository.findOne({
        where: { id: appInstance.genericClusterSiteId },
      });
      if (!site) {
        throw new NotFoundException(
          `Generic cluster site not found for app instance ${appInstance.id}`,
        );
      }
      // TODO: Decrypt kubeconfig before passing to adapter
      return new GenericClusterAdapter(site.kubeconfig, site.clusterName);
    }

    // TODO: Decrypt kubeconfig before passing to adapter
    return new GenericClusterAdapter(
      appInstance.genericClusterSite.kubeconfig,
      appInstance.genericClusterSite.clusterName,
    );
  }
}
