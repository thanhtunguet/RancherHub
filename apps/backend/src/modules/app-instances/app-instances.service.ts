import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppInstance } from '../../entities/app-instance.entity';
import { RancherSite } from '../../entities/rancher-site.entity';
import { GenericClusterSite } from '../../entities/generic-cluster-site.entity';
import { Environment } from '../../entities/environment.entity';
import { CreateAppInstanceDto } from './dto/create-app-instance.dto';
import { UpdateAppInstanceDto } from './dto/update-app-instance.dto';

@Injectable()
export class AppInstancesService {
  constructor(
    @InjectRepository(AppInstance)
    private appInstancesRepository: Repository<AppInstance>,
    @InjectRepository(RancherSite)
    private sitesRepository: Repository<RancherSite>,
    @InjectRepository(GenericClusterSite)
    private genericClusterSitesRepository: Repository<GenericClusterSite>,
    @InjectRepository(Environment)
    private environmentsRepository: Repository<Environment>,
  ) {}

  async create(
    createAppInstanceDto: CreateAppInstanceDto,
  ): Promise<AppInstance> {
    // Validate cluster type and corresponding site ID
    if (createAppInstanceDto.clusterType === 'rancher') {
      if (!createAppInstanceDto.rancherSiteId) {
        throw new BadRequestException(
          'Rancher site ID is required for rancher cluster type',
        );
      }

      const site = await this.sitesRepository.findOne({
        where: { id: createAppInstanceDto.rancherSiteId },
      });
      if (!site) {
        throw new BadRequestException('Rancher site not found');
      }
    } else if (createAppInstanceDto.clusterType === 'generic') {
      if (!createAppInstanceDto.genericClusterSiteId) {
        throw new BadRequestException(
          'Generic cluster site ID is required for generic cluster type',
        );
      }

      const genericSite = await this.genericClusterSitesRepository.findOne({
        where: { id: createAppInstanceDto.genericClusterSiteId },
      });
      if (!genericSite) {
        throw new BadRequestException('Generic cluster site not found');
      }
    }

    const environment = await this.environmentsRepository.findOne({
      where: { id: createAppInstanceDto.environmentId },
    });
    if (!environment) {
      throw new BadRequestException('Environment not found');
    }

    // Check for existing instance based on cluster type
    const whereCondition =
      createAppInstanceDto.clusterType === 'rancher'
        ? {
            rancherSiteId: createAppInstanceDto.rancherSiteId,
            cluster: createAppInstanceDto.cluster,
            namespace: createAppInstanceDto.namespace,
            environmentId: createAppInstanceDto.environmentId,
          }
        : {
            genericClusterSiteId: createAppInstanceDto.genericClusterSiteId,
            cluster: createAppInstanceDto.cluster,
            namespace: createAppInstanceDto.namespace,
            environmentId: createAppInstanceDto.environmentId,
          };

    const existingInstance = await this.appInstancesRepository.findOne({
      where: whereCondition,
    });

    if (existingInstance) {
      throw new BadRequestException(
        'App instance already exists for this site, cluster, namespace, and environment combination',
      );
    }

    const appInstance = this.appInstancesRepository.create({
      ...createAppInstanceDto,
      rancherSiteId:
        createAppInstanceDto.clusterType === 'rancher'
          ? createAppInstanceDto.rancherSiteId
          : null,
      genericClusterSiteId:
        createAppInstanceDto.clusterType === 'generic'
          ? createAppInstanceDto.genericClusterSiteId
          : null,
    });
    return await this.appInstancesRepository.save(appInstance);
  }

  async findAll(environmentId?: string): Promise<AppInstance[]> {
    const queryBuilder = this.appInstancesRepository
      .createQueryBuilder('appInstance')
      .leftJoinAndSelect('appInstance.rancherSite', 'rancherSite')
      .leftJoinAndSelect('appInstance.genericClusterSite', 'genericClusterSite')
      .leftJoinAndSelect('appInstance.environment', 'environment')
      .leftJoinAndSelect('appInstance.services', 'services')
      .orderBy('appInstance.createdAt', 'DESC');

    if (environmentId) {
      queryBuilder.where('appInstance.environmentId = :environmentId', {
        environmentId,
      });
    }

    return await queryBuilder.getMany();
  }

  async findOne(id: string): Promise<AppInstance> {
    const appInstance = await this.appInstancesRepository.findOne({
      where: { id },
      relations: [
        'rancherSite',
        'genericClusterSite',
        'environment',
        'services',
      ],
    });

    if (!appInstance) {
      throw new NotFoundException(`App instance with ID ${id} not found`);
    }

    return appInstance;
  }

  async update(
    id: string,
    updateAppInstanceDto: UpdateAppInstanceDto,
  ): Promise<AppInstance> {
    const appInstance = await this.findOne(id);

    // Validate cluster type and corresponding site ID if being updated
    if (
      updateAppInstanceDto.clusterType ||
      updateAppInstanceDto.rancherSiteId ||
      updateAppInstanceDto.genericClusterSiteId
    ) {
      const clusterType =
        updateAppInstanceDto.clusterType || appInstance.clusterType;

      if (clusterType === 'rancher') {
        const rancherSiteId =
          updateAppInstanceDto.rancherSiteId || appInstance.rancherSiteId;
        if (!rancherSiteId) {
          throw new BadRequestException(
            'Rancher site ID is required for rancher cluster type',
          );
        }

        const site = await this.sitesRepository.findOne({
          where: { id: rancherSiteId },
        });
        if (!site) {
          throw new BadRequestException('Rancher site not found');
        }

        // Clear generic cluster site ID when switching to rancher
        updateAppInstanceDto.genericClusterSiteId = null;
      } else if (clusterType === 'generic') {
        const genericSiteId =
          updateAppInstanceDto.genericClusterSiteId ||
          appInstance.genericClusterSiteId;
        if (!genericSiteId) {
          throw new BadRequestException(
            'Generic cluster site ID is required for generic cluster type',
          );
        }

        const genericSite = await this.genericClusterSitesRepository.findOne({
          where: { id: genericSiteId },
        });
        if (!genericSite) {
          throw new BadRequestException('Generic cluster site not found');
        }

        // Clear rancher site ID when switching to generic
        updateAppInstanceDto.rancherSiteId = null;
      }
    }

    if (updateAppInstanceDto.environmentId) {
      const environment = await this.environmentsRepository.findOne({
        where: { id: updateAppInstanceDto.environmentId },
      });
      if (!environment) {
        throw new BadRequestException('Environment not found');
      }
    }

    Object.assign(appInstance, updateAppInstanceDto);
    return await this.appInstancesRepository.save(appInstance);
  }

  async remove(id: string): Promise<void> {
    const appInstance = await this.findOne(id);
    await this.appInstancesRepository.remove(appInstance);
  }

  async findByEnvironment(environmentId: string): Promise<AppInstance[]> {
    return await this.appInstancesRepository.find({
      where: { environmentId },
      relations: [
        'rancherSite',
        'genericClusterSite',
        'environment',
        'services',
      ],
      order: { createdAt: 'ASC' },
    });
  }

  async findBySite(rancherSiteId: string): Promise<AppInstance[]> {
    return await this.appInstancesRepository.find({
      where: { rancherSiteId },
      relations: [
        'rancherSite',
        'genericClusterSite',
        'environment',
        'services',
      ],
      order: { createdAt: 'ASC' },
    });
  }

  async findByGenericClusterSite(
    genericClusterSiteId: string,
  ): Promise<AppInstance[]> {
    return await this.appInstancesRepository.find({
      where: { genericClusterSiteId },
      relations: [
        'rancherSite',
        'genericClusterSite',
        'environment',
        'services',
      ],
      order: { createdAt: 'ASC' },
    });
  }
}
