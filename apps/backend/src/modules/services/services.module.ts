import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServicesController } from './services.controller';
import { ServicesService } from './services.service';
import {
  Service,
  AppInstance,
  RancherSite,
  SyncOperation,
  SyncHistory,
} from '../../entities';
import { RancherApiService } from '../../services/rancher-api.service';
import { HarborApiService } from '../../services/harbor-api.service';
import { DockerHubApiService } from '../../services/dockerhub-api.service';
import { HarborSitesModule } from '../harbor-sites/harbor-sites.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Service,
      AppInstance,
      RancherSite,
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
  ],
  exports: [ServicesService],
})
export class ServicesModule {}
