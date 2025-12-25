import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigMapsController } from './configmaps.controller';
import { ConfigMapsService } from './configmaps.service';
import {
  AppInstance,
  RancherSite,
  GenericClusterSite,
  SyncOperation,
  SyncHistory,
} from '../../entities';
import { RancherApiService } from '../../services/rancher-api.service';
import { ClusterAdapterFactory } from '../../adapters/cluster-adapter.factory';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AppInstance,
      RancherSite,
      GenericClusterSite,
      SyncOperation,
      SyncHistory,
    ]),
    AuthModule,
  ],
  controllers: [ConfigMapsController],
  providers: [ConfigMapsService, RancherApiService, ClusterAdapterFactory],
  exports: [ConfigMapsService],
})
export class ConfigMapsModule {}
