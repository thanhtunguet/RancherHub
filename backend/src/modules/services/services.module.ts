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

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Service,
      AppInstance,
      RancherSite,
      SyncOperation,
      SyncHistory,
    ]),
  ],
  controllers: [ServicesController],
  providers: [ServicesService, RancherApiService],
  exports: [ServicesService],
})
export class ServicesModule {}