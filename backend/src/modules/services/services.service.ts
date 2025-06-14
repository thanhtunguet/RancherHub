import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Service,
  AppInstance,
  RancherSite,
  SyncOperation,
  SyncHistory,
} from '../../entities';
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

    this.logger.debug(
      `Found ${appInstances.length} app instances for environment: ${environmentId}`,
    );

    if (appInstances.length === 0) {
      this.logger.warn(
        `No app instances found for environment: ${environmentId}`,
      );
      return [];
    }

    const allServices: Service[] = [];

    for (const appInstance of appInstances) {
      this.logger.debug(
        `Processing app instance: ${appInstance.name} (${appInstance.cluster}/${appInstance.namespace})`,
      );
      try {
        // Fetch deployments from Rancher Kubernetes API
        const deployments =
          await this.rancherApiService.getDeploymentsFromK8sApi(
            appInstance.rancherSite,
            appInstance.cluster,
            appInstance.namespace,
          );
        this.logger.debug(
          `Received ${deployments.length} deployments from Rancher K8s API for ${appInstance.name}`,
        );
        // Update or create services in database
        for (const dep of deployments) {
          const serviceId = `${appInstance.cluster}-${appInstance.namespace}-${dep.name}`;
          let service = await this.serviceRepository.findOne({
            where: { id: serviceId, appInstanceId: appInstance.id },
          });
          if (service) {
            service.status = dep.state;
            service.replicas = dep.scale;
            service.availableReplicas = dep.availableReplicas;
            service.imageTag = dep.image;
            service.workloadType = dep.type;
            service.updatedAt = new Date();
          } else {
            service = this.serviceRepository.create({
              id: serviceId,
              name: dep.name,
              appInstanceId: appInstance.id,
              status: dep.state,
              replicas: dep.scale,
              availableReplicas: dep.availableReplicas,
              imageTag: dep.image,
              workloadType: dep.type,
            });
          }
          await this.serviceRepository.save(service);
          allServices.push(service);
          this.logger.debug(
            `Saved service: ${service.name} (${service.imageTag})`,
          );
        }
      } catch (error) {
        this.logger.error(
          `Failed to fetch services from app instance ${appInstance.name}: ${error.message}`,
        );
        // If API fails, return cached services from database
        const cachedServices = await this.serviceRepository.find({
          where: { appInstanceId: appInstance.id },
        });
        this.logger.debug(
          `Returning ${cachedServices.length} cached services for ${appInstance.name}`,
        );
        allServices.push(...cachedServices);
      }
    }
    this.logger.debug(
      `Total services returned for environment ${environmentId}: ${allServices.length}`,
    );
    return allServices;
  }

  async getServicesByAppInstance(appInstanceId: string): Promise<Service[]> {
    this.logger.debug(`Fetching services for app instance: ${appInstanceId}`);

    // Get the app instance
    const appInstance = await this.appInstanceRepository.findOne({
      where: { id: appInstanceId },
      relations: ['rancherSite'],
    });

    if (!appInstance) {
      throw new NotFoundException(
        `App instance with ID ${appInstanceId} not found`,
      );
    }

    this.logger.debug(
      `Found app instance: ${appInstance.name} (${appInstance.cluster}/${appInstance.namespace})`,
    );

    try {
      // Fetch deployments from Rancher Kubernetes API
      const deployments = await this.rancherApiService.getDeploymentsFromK8sApi(
        appInstance.rancherSite,
        appInstance.cluster,
        appInstance.namespace,
      );
      this.logger.debug(
        `Received ${deployments.length} deployments from Rancher K8s API for ${appInstance.name}`,
      );
      const services: Service[] = [];
      // Update or create services in database
      for (const dep of deployments) {
        const serviceId = `${appInstance.cluster}-${appInstance.namespace}-${dep.name}`;
        let service = await this.serviceRepository.findOne({
          where: { id: serviceId, appInstanceId: appInstance.id },
        });
        if (service) {
          service.status = dep.state;
          service.replicas = dep.scale;
          service.availableReplicas = dep.availableReplicas;
          service.imageTag = dep.image;
          service.workloadType = dep.type;
          service.updatedAt = new Date();
        } else {
          service = this.serviceRepository.create({
            id: serviceId,
            name: dep.name,
            appInstanceId: appInstance.id,
            status: dep.state,
            replicas: dep.scale,
            availableReplicas: dep.availableReplicas,
            imageTag: dep.image,
            workloadType: dep.type,
          });
        }
        await this.serviceRepository.save(service);
        services.push(service);
        this.logger.debug(
          `Saved service: ${service.name} (${service.imageTag})`,
        );
      }
      this.logger.debug(
        `Total services returned for app instance ${appInstanceId}: ${services.length}`,
      );
      return services;
    } catch (error) {
      this.logger.error(
        `Failed to fetch services from app instance ${appInstance.name}: ${error.message}`,
      );
      // If API fails, return cached services from database
      const cachedServices = await this.serviceRepository.find({
        where: { appInstanceId: appInstance.id },
      });
      this.logger.debug(
        `Returning ${cachedServices.length} cached services for ${appInstance.name}`,
      );
      return cachedServices;
    }
  }

  async syncServices(syncDto: SyncServicesDto): Promise<any> {
    this.logger.log(
      `Starting sync operation from env ${syncDto.sourceEnvironmentId} to ${syncDto.targetEnvironmentId}`,
    );

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
          this.logger.error(
            `Failed to sync service ${serviceId}: ${error.message}`,
          );
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
            serviceName: null,
            workloadType: null,
            sourceAppInstanceId: '', // We'll need to fetch this
            sourceEnvironmentName: null,
            sourceCluster: null,
            sourceNamespace: null,
            targetAppInstanceId,
            targetEnvironmentName: null,
            targetCluster: null,
            targetNamespace: null,
            previousImageTag: '',
            newImageTag: '',
            containerName: null,
            configChanges: null,
            status: 'failed',
            error: error.message,
            durationMs: null,
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
      relations: ['appInstance', 'appInstance.rancherSite', 'appInstance.environment'],
    });

    if (!sourceService) {
      throw new NotFoundException(`Source service not found: ${serviceId}`);
    }

    // Get target app instance
    const targetAppInstance = await this.appInstanceRepository.findOne({
      where: { id: targetAppInstanceId },
      relations: ['rancherSite', 'environment'],
    });

    if (!targetAppInstance) {
      throw new NotFoundException(
        `Target app instance not found: ${targetAppInstanceId}`,
      );
    }

    // Find or create target service
    const targetServiceId = `${targetAppInstance.cluster}-${targetAppInstance.namespace}-${sourceService.name}`;
    let targetService = await this.serviceRepository.findOne({
      where: { id: targetServiceId, appInstanceId: targetAppInstanceId },
    });

    const previousImageTag = targetService?.imageTag || '';

    this.logger.log(
      `Syncing service ${sourceService.name} from ${sourceService.appInstance.cluster}/${sourceService.appInstance.namespace} to ${targetAppInstance.cluster}/${targetAppInstance.namespace}`,
    );
    this.logger.log(
      `Source image: ${sourceService.imageTag}`,
    );

    // Normalize workload type (remove plurals if present)
    const normalizedWorkloadType = sourceService.workloadType?.toLowerCase().replace(/s$/, '') || 'deployment';
    
    try {
      await this.rancherApiService.updateWorkloadImage(
        targetAppInstance.rancherSite,
        targetAppInstance.cluster,
        targetAppInstance.namespace,
        sourceService.name,
        normalizedWorkloadType,
        sourceService.imageTag,
      );
      this.logger.log(`Successfully updated workload ${sourceService.name} in Rancher`);
    } catch (rancherError) {
      this.logger.error(`Failed to update workload in Rancher: ${rancherError.message}`);
      throw new Error(`Rancher API update failed: ${rancherError.message}`);
    }

    // Update or create target service in database
    if (targetService) {
      targetService.imageTag = sourceService.imageTag;
      targetService.workloadType = normalizedWorkloadType;
      targetService.status = 'synced';
      targetService.lastSynced = new Date();
      targetService.updatedAt = new Date();
    } else {
      targetService = this.serviceRepository.create({
        id: targetServiceId,
        name: sourceService.name,
        appInstanceId: targetAppInstanceId,
        status: 'synced',
        replicas: sourceService.replicas,
        availableReplicas: 0, // Will be updated on next fetch
        imageTag: sourceService.imageTag,
        workloadType: normalizedWorkloadType,
        lastSynced: new Date(),
      });
    }

    await this.serviceRepository.save(targetService);

    // Record sync in history with detailed information
    const startTime = Date.now();
    await this.syncHistoryRepository.save({
      syncOperationId,
      serviceId,
      serviceName: sourceService.name || null,
      workloadType: normalizedWorkloadType || null,
      sourceAppInstanceId: sourceService.appInstanceId,
      sourceEnvironmentName: sourceService.appInstance?.environment?.name || null,
      sourceCluster: sourceService.appInstance?.cluster || null,
      sourceNamespace: sourceService.appInstance?.namespace || null,
      targetAppInstanceId,
      targetEnvironmentName: targetAppInstance.environment?.name || null,
      targetCluster: targetAppInstance.cluster || null,
      targetNamespace: targetAppInstance.namespace || null,
      previousImageTag,
      newImageTag: sourceService.imageTag,
      containerName: sourceService.name || null,
      configChanges: {
        imageTag: {
          from: previousImageTag,
          to: sourceService.imageTag
        }
      },
      status: 'success',
      durationMs: Date.now() - startTime,
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
        { envId: environmentId },
      );
    }

    return queryBuilder.getMany();
  }

  async getDetailedSyncHistory(environmentId?: string): Promise<SyncHistory[]> {
    const queryBuilder = this.syncHistoryRepository
      .createQueryBuilder('history')
      .leftJoinAndSelect('history.syncOperation', 'operation')
      .orderBy('history.timestamp', 'DESC');

    if (environmentId) {
      queryBuilder
        .leftJoin('history.syncOperation', 'op')
        .where(
          'op.sourceEnvironmentId = :envId OR op.targetEnvironmentId = :envId',
          { envId: environmentId },
        );
    }

    return queryBuilder.getMany();
  }

  async compareServices(sourceEnvironmentId: string, targetEnvironmentId: string): Promise<any> {
    this.logger.debug(`Comparing services between environments: ${sourceEnvironmentId} -> ${targetEnvironmentId}`);

    // Fetch services from both environments
    const [sourceServices, targetServices] = await Promise.all([
      this.getServicesByEnvironment(sourceEnvironmentId),
      this.getServicesByEnvironment(targetEnvironmentId),
    ]);

    this.logger.debug(`Source services: ${sourceServices.length}, Target services: ${targetServices.length}`);

    // Create maps for quick lookup
    const sourceServiceMap = new Map(sourceServices.map(s => [s.name, s]));
    const targetServiceMap = new Map(targetServices.map(s => [s.name, s]));

    // Get all unique service names
    const allServiceNames = new Set([
      ...sourceServices.map(s => s.name),
      ...targetServices.map(s => s.name),
    ]);

    const comparisons = [];

    for (const serviceName of allServiceNames) {
      const sourceService = sourceServiceMap.get(serviceName);
      const targetService = targetServiceMap.get(serviceName);

      // Extract version from imageTag (part after ':')
      const extractVersion = (imageTag: string) => {
        if (!imageTag) return null;
        const parts = imageTag.split(':');
        return parts.length > 1 ? parts[parts.length - 1] : imageTag;
      };

      const sourceVersion = sourceService ? extractVersion(sourceService.imageTag) : null;
      const targetVersion = targetService ? extractVersion(targetService.imageTag) : null;

      const comparison = {
        serviceName,
        workloadType: sourceService?.workloadType || targetService?.workloadType,
        source: sourceService ? {
          environmentId: sourceEnvironmentId,
          imageTag: sourceService.imageTag,
          version: sourceVersion,
          status: sourceService.status,
          replicas: sourceService.replicas,
          availableReplicas: sourceService.availableReplicas,
          appInstanceId: sourceService.appInstanceId,
          lastUpdated: sourceService.updatedAt,
        } : null,
        target: targetService ? {
          environmentId: targetEnvironmentId,
          imageTag: targetService.imageTag,
          version: targetVersion,
          status: targetService.status,
          replicas: targetService.replicas,
          availableReplicas: targetService.availableReplicas,
          appInstanceId: targetService.appInstanceId,
          lastUpdated: targetService.updatedAt,
        } : null,
        differences: {
          existence: !sourceService || !targetService,
          imageTag: sourceService && targetService && sourceService.imageTag !== targetService.imageTag,
          version: sourceVersion !== targetVersion,
          status: sourceService && targetService && sourceService.status !== targetService.status,
          replicas: sourceService && targetService && sourceService.replicas !== targetService.replicas,
        },
        status: this.getComparisonStatus(sourceService, targetService),
        differenceType: this.getDifferenceType(sourceService, targetService),
      };

      comparisons.push(comparison);
    }

    // Sort comparisons by differenceType priority then by service name
    comparisons.sort((a, b) => {
      if (a.differenceType !== b.differenceType) {
        const statusOrder = { 'missing_in_source': 0, 'missing_in_target': 1, 'different': 2, 'identical': 3 };
        return statusOrder[a.differenceType] - statusOrder[b.differenceType];
      }
      return a.serviceName.localeCompare(b.serviceName);
    });

    const summary = {
      totalServices: allServiceNames.size,
      identical: comparisons.filter(c => c.differenceType === 'identical').length,
      different: comparisons.filter(c => c.differenceType === 'different').length,
      missingInSource: comparisons.filter(c => c.differenceType === 'missing_in_source').length,
      missingInTarget: comparisons.filter(c => c.differenceType === 'missing_in_target').length,
    };

    this.logger.debug(`Comparison summary:`, summary);

    return {
      sourceEnvironmentId,
      targetEnvironmentId,
      summary,
      comparisons,
    };
  }

  private getComparisonStatus(sourceService: Service, targetService: Service): string {
    if (!sourceService || !targetService) {
      return 'missing';
    }
    
    if (sourceService.imageTag !== targetService.imageTag || 
        sourceService.status !== targetService.status ||
        sourceService.replicas !== targetService.replicas) {
      return 'different';
    }
    
    return 'identical';
  }

  private getDifferenceType(sourceService: Service, targetService: Service): string {
    if (!sourceService && targetService) {
      return 'missing_in_source';
    }
    if (sourceService && !targetService) {
      return 'missing_in_target';
    }
    if (sourceService && targetService && 
        (sourceService.imageTag !== targetService.imageTag || 
         sourceService.status !== targetService.status ||
         sourceService.replicas !== targetService.replicas)) {
      return 'different';
    }
    return 'identical';
  }
}
