import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GenericClusterSite } from '../../entities/generic-cluster-site.entity';
import { GenericClusterSitesController } from './generic-cluster-sites.controller';
import { GenericClusterSitesService } from './generic-cluster-sites.service';

@Module({
  imports: [TypeOrmModule.forFeature([GenericClusterSite])],
  controllers: [GenericClusterSitesController],
  providers: [GenericClusterSitesService],
  exports: [GenericClusterSitesService],
})
export class GenericClusterSitesModule {}
