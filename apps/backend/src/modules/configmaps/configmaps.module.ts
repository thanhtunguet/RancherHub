import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigMapsController } from './configmaps.controller';
import { ConfigMapsService } from './configmaps.service';
import { AppInstance, RancherSite } from '../../entities';
import { RancherApiService } from '../../services/rancher-api.service';

@Module({
  imports: [TypeOrmModule.forFeature([AppInstance, RancherSite])],
  controllers: [ConfigMapsController],
  providers: [ConfigMapsService, RancherApiService],
  exports: [ConfigMapsService],
})
export class ConfigMapsModule {}