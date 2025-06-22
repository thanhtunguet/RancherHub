import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
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
import { getServicesByEnvironment } from './get-services-by-environment';
import { getServicesByAppInstance } from './get-services-by-app-instance';
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
  ) {}

  async getServicesByEnvironment(environmentId: string) {
    return getServicesByEnvironment(this, environmentId);
  }

  async getServicesByAppInstance(appInstanceId: string) {
    return getServicesByAppInstance(this, appInstanceId);
  }

  async syncServices(syncDto: SyncServicesDto) {
    return syncServices(this, syncDto);
  }

  async syncSingleService(serviceId: string, targetAppInstanceId: string, syncOperationId: string) {
    return syncSingleService(this, serviceId, targetAppInstanceId, syncOperationId);
  }

  async getSyncHistory(environmentId?: string) {
    return getSyncHistory(this, environmentId);
  }

  async getDetailedSyncHistory(environmentId?: string) {
    return getDetailedSyncHistory(this, environmentId);
  }

  async compareServices(sourceEnvironmentId: string, targetEnvironmentId: string) {
    return compareServices(this, sourceEnvironmentId, targetEnvironmentId);
  }

  async compareServicesByInstance(sourceAppInstanceId: string, targetAppInstanceId: string) {
    return compareServicesByInstance(this, sourceAppInstanceId, targetAppInstanceId);
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

  // ... All methods from ServicesService ...
} 