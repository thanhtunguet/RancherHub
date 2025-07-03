import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RancherSite } from '../../entities/rancher-site.entity';
import { SitesService } from './sites.service';
import { SitesController } from './sites.controller';
import { RancherApiService } from '../../services/rancher-api.service';

@Module({
  imports: [TypeOrmModule.forFeature([RancherSite])],
  controllers: [SitesController],
  providers: [SitesService, RancherApiService],
  exports: [SitesService],
})
export class SitesModule {}