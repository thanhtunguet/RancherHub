import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Service, AppInstance, RancherSite, SyncOperation, SyncHistory } from '../../entities';
import { RancherApiService } from '../../services/rancher-api.service';
import { SyncServicesDto } from './dto/sync-services.dto';

@Injectable()
export class ServicesService {
  private readonly logger = new Logger(ServicesService.name);

  constructor(
    @InjectRepository(Service)
    private readonly serviceRepository: Repository<Service>,
    @InjectRepository(AppInstance)
    private readonly appInstanceRepository: Repository<AppInstance>,
    @InjectRepository(RancherSite)
    private readonly rancherSiteRepository: Repository<RancherSite>,
    @InjectRepository(SyncOperation)
    private readonly syncOperationRepository: Repository<SyncOperation>,
    @InjectRepository(SyncHistory)
    private readonly syncHistoryRepository: Repository<SyncHistory>,
    private readonly rancherApiService: RancherApiService,
  ) {}

  async getServicesByEnvironment(environmentId: string): Promise<Service[]> {
    this.logger.debug(`Fetching services for environment: ${environmentId}`);

    // Get all app instances for this environment
    const appInstances = await this.appInstanceRepository.find({
      where: { environmentId },
      relations: ['rancherSite', 'services'],
    });

    if (appInstances.length === 0) {
      this.logger.warn(`No app instances found for environment: ${environmentId}`);
      return [];
    }

    const allServices: Service[] = [];

    for (const appInstance of appInstances) {
      try {
        // Fetch fresh services from Rancher API
        const rancherServices = await this.rancherApiService.getWorkloads(
          appInstance.rancherSite,
          appInstance.cluster,
          appInstance.namespace,
        );

        // Update or create services in database
        for (const rancherService of rancherServices) {
          const serviceId = `${appInstance.cluster}-${appInstance.namespace}-${rancherService.name}`;
          
          let service = await this.serviceRepository.findOne({
            where: { id: serviceId, appInstanceId: appInstance.id },
          });

          if (service) {
            // Update existing service
            service.status = rancherService.state;
            service.replicas = rancherService.scale;
            service.availableReplicas = rancherService.availableReplicas;
            service.imageTag = rancherService.image;
            service.workloadType = rancherService.type;
            service.updatedAt = new Date();
          } else {
            // Create new service
            service = this.serviceRepository.create({
              id: serviceId,
              name: rancherService.name,
              appInstanceId: appInstance.id,
              status: rancherService.state,
              replicas: rancherService.scale,
              availableReplicas: rancherService.availableReplicas,
              imageTag: rancherService.image,
              workloadType: rancherService.type,
            });
          }

          await this.serviceRepository.save(service);
          allServices.push(service);
        }
      } catch (error) {
        this.logger.error(
          `Failed to fetch services from app instance ${appInstance.name}: ${error.message}`,
        );
        
        // If API fails, return cached services from database
        const cachedServices = await this.serviceRepository.find({
          where: { appInstanceId: appInstance.id },
        });
        allServices.push(...cachedServices);
      }
    }

    return allServices;
  }

  async syncServices(syncDto: SyncServicesDto): Promise<any> {
    this.logger.log(`Starting sync operation from env ${syncDto.sourceEnvironmentId} to ${syncDto.targetEnvironmentId}`);

    // Create sync operation record
    const syncOperation = this.syncOperationRepository.create({
      sourceEnvironmentId: syncDto.sourceEnvironmentId,
      targetEnvironmentId: syncDto.targetEnvironmentId,
      serviceIds: syncDto.serviceIds,
      status: 'pending',
      startTime: new Date(),
      initiatedBy: 'system', // TODO: Add user context
    });

    await this.syncOperationRepository.save(syncOperation);

    const syncResults = [];
    let hasErrors = false;

    try {
      for (let i = 0; i < syncDto.serviceIds.length; i++) {
        const serviceId = syncDto.serviceIds[i];
        const targetAppInstanceId = syncDto.targetAppInstanceIds[i];

        try {
          const result = await this.syncSingleService(
            serviceId,
            targetAppInstanceId,
            syncOperation.id,
          );
          syncResults.push(result);
        } catch (error) {
          this.logger.error(`Failed to sync service ${serviceId}: ${error.message}`);
          hasErrors = true;
          
          const errorResult = {
            serviceId,
            targetAppInstanceId,
            status: 'failed',
            error: error.message,
          };
          syncResults.push(errorResult);

          // Record failed sync in history
          await this.syncHistoryRepository.save({
            syncOperationId: syncOperation.id,
            serviceId,
            sourceAppInstanceId: '', // We'll need to fetch this
            targetAppInstanceId,
            previousImageTag: '',
            newImageTag: '',
            status: 'failed',
            error: error.message,
            timestamp: new Date(),
          });
        }
      }

      // Update sync operation status
      syncOperation.status = hasErrors ? 'partial' : 'completed';
      syncOperation.endTime = new Date();
      await this.syncOperationRepository.save(syncOperation);

      return {
        id: syncOperation.id,
        status: syncOperation.status,
        startTime: syncOperation.startTime,
        endTime: syncOperation.endTime,
        results: syncResults,
      };

    } catch (error) {
      // Mark entire operation as failed
      syncOperation.status = 'failed';
      syncOperation.endTime = new Date();
      await this.syncOperationRepository.save(syncOperation);
      throw error;
    }
  }

  private async syncSingleService(
    serviceId: string,
    targetAppInstanceId: string,
    syncOperationId: string,
  ): Promise<any> {
    // Get source service
    const sourceService = await this.serviceRepository.findOne({
      where: { id: serviceId },
      relations: ['appInstance', 'appInstance.rancherSite'],
    });

    if (!sourceService) {
      throw new NotFoundException(`Source service not found: ${serviceId}`);
    }

    // Get target app instance
    const targetAppInstance = await this.appInstanceRepository.findOne({
      where: { id: targetAppInstanceId },
      relations: ['rancherSite'],
    });

    if (!targetAppInstance) {
      throw new NotFoundException(`Target app instance not found: ${targetAppInstanceId}`);
    }

    // Find or create target service
    const targetServiceId = `${targetAppInstance.cluster}-${targetAppInstance.namespace}-${sourceService.name}`;
    let targetService = await this.serviceRepository.findOne({
      where: { id: targetServiceId, appInstanceId: targetAppInstanceId },
    });

    const previousImageTag = targetService?.imageTag || '';

    // Update workload in target Rancher instance
    const workloadId = `${targetAppInstance.cluster}:${targetAppInstance.namespace}:${sourceService.name}`;
    
    await this.rancherApiService.updateWorkloadImage(
      targetAppInstance.rancherSite,
      workloadId,
      sourceService.imageTag,
    );

    // Update or create target service in database
    if (targetService) {
      targetService.imageTag = sourceService.imageTag;
      targetService.lastSynced = new Date();
      targetService.updatedAt = new Date();
    } else {
      targetService = this.serviceRepository.create({
        id: targetServiceId,
        name: sourceService.name,
        appInstanceId: targetAppInstanceId,
        status: 'syncing',
        replicas: sourceService.replicas,
        availableReplicas: 0, // Will be updated on next fetch
        imageTag: sourceService.imageTag,
        workloadType: sourceService.workloadType,
        lastSynced: new Date(),
      });
    }

    await this.serviceRepository.save(targetService);

    // Record sync in history
    await this.syncHistoryRepository.save({
      syncOperationId,
      serviceId,
      sourceAppInstanceId: sourceService.appInstanceId,
      targetAppInstanceId,
      previousImageTag,
      newImageTag: sourceService.imageTag,
      status: 'success',
      timestamp: new Date(),
    });

    return {
      serviceId,
      targetAppInstanceId,
      previousImageTag,
      newImageTag: sourceService.imageTag,
      status: 'success',
    };
  }

  async getSyncHistory(environmentId?: string): Promise<SyncOperation[]> {
    const queryBuilder = this.syncOperationRepository
      .createQueryBuilder('operation')
      .leftJoinAndSelect('operation.syncHistory', 'history')
      .orderBy('operation.startTime', 'DESC');

    if (environmentId) {
      queryBuilder.where(
        'operation.sourceEnvironmentId = :envId OR operation.targetEnvironmentId = :envId',
        { envId: environmentId }
      );
    }

    return queryBuilder.getMany();
  }
}