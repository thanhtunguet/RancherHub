import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SecretsController } from './secrets.controller';
import { SecretsService } from './secrets.service';
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
  controllers: [SecretsController],
  providers: [SecretsService, RancherApiService, ClusterAdapterFactory],
  exports: [SecretsService],
})
export class SecretsModule {}
