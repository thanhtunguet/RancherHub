import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServicesController } from './services.controller';
import { ServicesService } from './services.service';
import {
  Service,
  AppInstance,
  RancherSite,
  GenericClusterSite,
  SyncOperation,
  SyncHistory,
} from '../../entities';
import { RancherApiService } from '../../services/rancher-api.service';
import { HarborApiService } from '../../services/harbor-api.service';
import { DockerHubApiService } from '../../services/dockerhub-api.service';
import { ClusterAdapterFactory } from '../../adapters/cluster-adapter.factory';
import { RegistryAdapterFactory } from '../../adapters/registry-adapter.factory';
import { HarborSitesModule } from '../harbor-sites/harbor-sites.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Service,
      AppInstance,
      RancherSite,
      GenericClusterSite,
      SyncOperation,
      SyncHistory,
    ]),
    HarborSitesModule,
    AuthModule,
  ],
  controllers: [ServicesController],
  providers: [
    ServicesService,
    RancherApiService,
    HarborApiService,
    DockerHubApiService,
    ClusterAdapterFactory,
    RegistryAdapterFactory,
  ],
  exports: [ServicesService],
})
export class ServicesModule {}
