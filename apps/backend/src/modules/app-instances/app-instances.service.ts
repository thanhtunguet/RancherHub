import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppInstance } from '../../entities/app-instance.entity';
import { RancherSite } from '../../entities/rancher-site.entity';
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
    @InjectRepository(Environment)
    private environmentsRepository: Repository<Environment>,
  ) {}

  async create(
    createAppInstanceDto: CreateAppInstanceDto,
  ): Promise<AppInstance> {
    const site = await this.sitesRepository.findOne({
      where: { id: createAppInstanceDto.rancherSiteId },
    });
    if (!site) {
      throw new BadRequestException('Rancher site not found');
    }

    const environment = await this.environmentsRepository.findOne({
      where: { id: createAppInstanceDto.environmentId },
    });
    if (!environment) {
      throw new BadRequestException('Environment not found');
    }

    const existingInstance = await this.appInstancesRepository.findOne({
      where: {
        rancherSiteId: createAppInstanceDto.rancherSiteId,
        cluster: createAppInstanceDto.cluster,
        namespace: createAppInstanceDto.namespace,
        environmentId: createAppInstanceDto.environmentId,
      },
    });

    if (existingInstance) {
      throw new BadRequestException(
        'App instance already exists for this site, cluster, namespace, and environment combination',
      );
    }

    const appInstance =
      this.appInstancesRepository.create(createAppInstanceDto);
    return await this.appInstancesRepository.save(appInstance);
  }

  async findAll(environmentId?: string): Promise<AppInstance[]> {
    const queryBuilder = this.appInstancesRepository
      .createQueryBuilder('appInstance')
      .leftJoinAndSelect('appInstance.rancherSite', 'rancherSite')
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
      relations: ['rancherSite', 'environment', 'services'],
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

    if (updateAppInstanceDto.rancherSiteId) {
      const site = await this.sitesRepository.findOne({
        where: { id: updateAppInstanceDto.rancherSiteId },
      });
      if (!site) {
        throw new BadRequestException('Rancher site not found');
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
      relations: ['rancherSite', 'environment', 'services'],
      order: { createdAt: 'ASC' },
    });
  }

  async findBySite(rancherSiteId: string): Promise<AppInstance[]> {
    return await this.appInstancesRepository.find({
      where: { rancherSiteId },
      relations: ['rancherSite', 'environment', 'services'],
      order: { createdAt: 'ASC' },
    });
  }
}
