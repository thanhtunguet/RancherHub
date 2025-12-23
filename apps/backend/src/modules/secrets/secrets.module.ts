import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SecretsController } from './secrets.controller';
import { SecretsService } from './secrets.service';
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
  controllers: [SecretsController],
  providers: [SecretsService, RancherApiService],
  exports: [SecretsService],
})
export class SecretsModule {}
