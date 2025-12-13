import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigMapsController } from './configmaps.controller';
import { ConfigMapsService } from './configmaps.service';
import {
  AppInstance,
  RancherSite,
  SyncOperation,
  SyncHistory,
} from '../../entities';
import { RancherApiService } from '../../services/rancher-api.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AppInstance,
      RancherSite,
      SyncOperation,
      SyncHistory,
    ]),
    AuthModule,
  ],
  controllers: [ConfigMapsController],
  providers: [ConfigMapsService, RancherApiService],
  exports: [ConfigMapsService],
})
export class ConfigMapsModule {}
