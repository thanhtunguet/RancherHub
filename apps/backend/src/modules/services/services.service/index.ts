import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Service,
  AppInstance,
  RancherSite,
  SyncOperation,
  SyncHistory,
} from 'src/entities';
import { RancherApiService } from 'src/services/rancher-api.service';
import { HarborApiService } from 'src/services/harbor-api.service';
import { DockerHubApiService } from 'src/services/dockerhub-api.service';
import { ClusterAdapterFactory } from 'src/adapters/cluster-adapter.factory';
import { getServicesByEnvironmentDirect } from './get-services-by-environment-direct';
import { getServicesByAppInstanceDirect } from './get-services-by-app-instance-direct';
import { syncServices } from './sync-services';
import { syncSingleService } from './sync-single-service';
import { getSyncHistory } from './get-sync-history';
import { getDetailedSyncHistory } from './get-detailed-sync-history';
import { compareServices } from './compare-services';
import { compareServicesByInstance } from './compare-services-by-instance';
import { getComparisonStatus } from './get-comparison-status';
import { getDifferenceType } from './get-difference-type';
import { getServicesWithImageSizes } from './get-services-with-image-sizes';
import { getAllAppInstancesGroupedByEnvironment } from './get-all-app-instances-grouped-by-environment';
import { getImageTags } from './get-image-tags';
import { updateServiceImage } from './update-service-image';
import { HarborSitesService } from '@/modules/harbor-sites/harbor-sites.service';
import { SyncServicesDto } from '../dto/sync-services.dto';

@Injectable()
export class ServicesService {
  public readonly logger = new Logger(ServicesService.name);

  constructor(
    @InjectRepository(Service)
    public readonly serviceRepository: Repository<Service>,
    @InjectRepository(AppInstance)
    public readonly appInstanceRepository: Repository<AppInstance>,
    @InjectRepository(RancherSite)
    public readonly rancherSiteRepository: Repository<RancherSite>,
    @InjectRepository(SyncOperation)
    public readonly syncOperationRepository: Repository<SyncOperation>,
    @InjectRepository(SyncHistory)
    public readonly syncHistoryRepository: Repository<SyncHistory>,
    public readonly rancherApiService: RancherApiService,
    public readonly harborApiService: HarborApiService,
    public readonly dockerHubApiService: DockerHubApiService,
    public readonly harborSitesService: HarborSitesService,
    public readonly clusterAdapterFactory: ClusterAdapterFactory,
  ) {}

  async getServicesByEnvironment(environmentId: string) {
    return getServicesByEnvironmentDirect(this, environmentId);
  }

  async getServicesByAppInstance(appInstanceId: string) {
    return getServicesByAppInstanceDirect(this, appInstanceId);
  }

  async syncServices(syncDto: SyncServicesDto, initiatedBy?: string) {
    return syncServices(this, syncDto, initiatedBy);
  }

  async syncSingleService(
    serviceId: string,
    targetAppInstanceId: string,
    syncOperationId: string,
    initiatedBy?: string,
  ) {
    return syncSingleService(
      this,
      serviceId,
      targetAppInstanceId,
      syncOperationId,
      initiatedBy,
    );
  }

  async getSyncHistory(environmentId?: string) {
    return getSyncHistory(this, environmentId);
  }

  async getDetailedSyncHistory(environmentId?: string) {
    return getDetailedSyncHistory(this, environmentId);
  }

  async compareServices(
    sourceEnvironmentId: string,
    targetEnvironmentId: string,
  ) {
    return compareServices(this, sourceEnvironmentId, targetEnvironmentId);
  }

  async compareServicesByInstance(
    sourceAppInstanceId: string,
    targetAppInstanceId: string,
  ) {
    return compareServicesByInstance(
      this,
      sourceAppInstanceId,
      targetAppInstanceId,
    );
  }

  getComparisonStatus(sourceService: Service, targetService: Service) {
    return getComparisonStatus(this, sourceService, targetService);
  }

  getDifferenceType(sourceService: Service, targetService: Service) {
    return getDifferenceType(this, sourceService, targetService);
  }

  async getServicesWithImageSizes(appInstanceId: string) {
    return getServicesWithImageSizes(this, appInstanceId);
  }

  async getAllAppInstancesGroupedByEnvironment() {
    return getAllAppInstancesGroupedByEnvironment(this);
  }

  async getImageTags(serviceId: string) {
    return getImageTags(this, serviceId);
  }

  async updateServiceImage(serviceId: string, newTag: string) {
    return updateServiceImage(this, serviceId, newTag);
  }

  // ... All methods from ServicesService ...
}
