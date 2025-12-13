import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RancherSite } from '../../entities/rancher-site.entity';
import { SitesService } from './sites.service';
import { SitesController } from './sites.controller';
import { RancherApiService } from '../../services/rancher-api.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([RancherSite]), AuthModule],
  controllers: [SitesController],
  providers: [SitesService, RancherApiService],
  exports: [SitesService],
})
export class SitesModule {}
