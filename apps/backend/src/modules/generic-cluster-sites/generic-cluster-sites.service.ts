import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as yaml from 'js-yaml';
import { KubeConfig } from '@kubernetes/client-node';
import { GenericClusterSite } from '../../entities/generic-cluster-site.entity';
import { CreateGenericClusterSiteDto } from './dto/create-generic-cluster-site.dto';
import { UpdateGenericClusterSiteDto } from './dto/update-generic-cluster-site.dto';
import { TestConnectionResponseDto } from './dto/test-connection.dto';

@Injectable()
export class GenericClusterSitesService {
  constructor(
    @InjectRepository(GenericClusterSite)
    private genericClusterSitesRepository: Repository<GenericClusterSite>,
  ) {}

  /**
   * Validate and parse kubeconfig
   * Extracts cluster name and server URL
   */
  private validateAndParseKubeconfig(kubeconfigContent: string): {
    clusterName: string;
    serverUrl: string;
  } {
    try {
      // Parse YAML
      const config = yaml.load(kubeconfigContent) as any;

      if (!config || typeof config !== 'object') {
        throw new Error('Invalid kubeconfig format');
      }

      // Validate required fields
      if (!config.clusters || !Array.isArray(config.clusters)) {
        throw new Error('Kubeconfig must contain clusters array');
      }

      if (!config.contexts || !Array.isArray(config.contexts)) {
        throw new Error('Kubeconfig must contain contexts array');
      }

      if (!config.users || !Array.isArray(config.users)) {
        throw new Error('Kubeconfig must contain users array');
      }

      // Get current context
      const currentContextName = config['current-context'];
      if (!currentContextName) {
        throw new Error('Kubeconfig must have a current-context');
      }

      // Find current context
      const currentContext = config.contexts.find(
        (ctx: any) => ctx.name === currentContextName,
      );
      if (!currentContext || !currentContext.context) {
        throw new Error(`Current context '${currentContextName}' not found`);
      }

      // Find cluster referenced by current context
      const clusterName = currentContext.context.cluster;
      const cluster = config.clusters.find((c: any) => c.name === clusterName);
      if (!cluster || !cluster.cluster) {
        throw new Error(`Cluster '${clusterName}' not found in kubeconfig`);
      }

      // Extract server URL
      const serverUrl = cluster.cluster.server;
      if (!serverUrl) {
        throw new Error('Cluster must have a server URL');
      }

      return {
        clusterName,
        serverUrl,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        `Invalid kubeconfig: ${error.message || 'Unknown error'}`,
      );
    }
  }

  /**
   * Test connection to Kubernetes cluster using kubeconfig
   */
  private async testKubeconfig(
    kubeconfigContent: string,
  ): Promise<{ serverVersion: string }> {
    try {
      const kc = new KubeConfig();
      kc.loadFromString(kubeconfigContent);

      const k8sApi = kc.makeApiClient(
        (await import('@kubernetes/client-node')).CoreV1Api,
      );

      // Try to list namespaces to test connection
      await k8sApi.listNamespace();

      return {
        serverVersion: 'v1',
      };
    } catch (error) {
      throw new BadRequestException(
        `Failed to connect to cluster: ${error.message || 'Connection failed'}`,
      );
    }
  }

  async create(
    createGenericClusterSiteDto: CreateGenericClusterSiteDto,
  ): Promise<GenericClusterSite> {
    const { name, kubeconfig } = createGenericClusterSiteDto;

    // Validate and parse kubeconfig
    const { clusterName, serverUrl } =
      this.validateAndParseKubeconfig(kubeconfig);

    // Test connection before saving
    await this.testKubeconfig(kubeconfig);

    // Create and save the site
    const site = this.genericClusterSitesRepository.create({
      name,
      kubeconfig,
      clusterName,
      serverUrl,
      active: true,
    });

    return await this.genericClusterSitesRepository.save(site);
  }

  async findAll(): Promise<GenericClusterSite[]> {
    return await this.genericClusterSitesRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<GenericClusterSite> {
    const site = await this.genericClusterSitesRepository.findOne({
      where: { id },
    });
    if (!site) {
      throw new NotFoundException(
        `Generic cluster site with ID ${id} not found`,
      );
    }
    return site;
  }

  async update(
    id: string,
    updateGenericClusterSiteDto: UpdateGenericClusterSiteDto,
  ): Promise<GenericClusterSite> {
    const site = await this.findOne(id);

    // If kubeconfig is being updated, validate it
    if (updateGenericClusterSiteDto.kubeconfig) {
      const { clusterName, serverUrl } = this.validateAndParseKubeconfig(
        updateGenericClusterSiteDto.kubeconfig,
      );

      // Test connection before updating
      await this.testKubeconfig(updateGenericClusterSiteDto.kubeconfig);

      Object.assign(site, {
        ...updateGenericClusterSiteDto,
        clusterName,
        serverUrl,
      });
    } else {
      Object.assign(site, updateGenericClusterSiteDto);
    }

    return await this.genericClusterSitesRepository.save(site);
  }

  async remove(id: string): Promise<void> {
    const site = await this.findOne(id);
    await this.genericClusterSitesRepository.remove(site);
  }

  async testConnection(id: string): Promise<TestConnectionResponseDto> {
    const site = await this.findOne(id);

    try {
      const { serverVersion } = await this.testKubeconfig(site.kubeconfig);

      return {
        success: true,
        message: 'Connection successful',
        data: {
          serverVersion,
          clusterName: site.clusterName,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Connection failed',
      };
    }
  }

  async setActive(id: string, active: boolean): Promise<GenericClusterSite> {
    const site = await this.findOne(id);

    if (active) {
      // Deactivate all other sites
      await this.genericClusterSitesRepository.update(
        { active: true },
        { active: false },
      );
    }

    site.active = active;
    return await this.genericClusterSitesRepository.save(site);
  }

  async getActiveSite(): Promise<GenericClusterSite | null> {
    return await this.genericClusterSitesRepository.findOne({
      where: { active: true },
    });
  }

  async getNamespaces(id: string) {
    const site = await this.findOne(id);

    try {
      const kc = new KubeConfig();
      kc.loadFromString(site.kubeconfig);

      const k8sApi = kc.makeApiClient(
        (await import('@kubernetes/client-node')).CoreV1Api,
      );

      const namespacesResponse = await k8sApi.listNamespace();

      return namespacesResponse.items.map((ns) => ({
        id: ns.metadata?.uid || '',
        name: ns.metadata?.name || '',
        state: ns.status?.phase || 'Active',
        created: ns.metadata?.creationTimestamp || '',
      }));
    } catch (error) {
      throw new BadRequestException(
        `Failed to fetch namespaces: ${error.message}`,
      );
    }
  }
}
