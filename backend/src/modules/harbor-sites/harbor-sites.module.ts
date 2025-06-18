import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HarborSite } from '../../entities/harbor-site.entity';
import { HarborSitesService } from './harbor-sites.service';
import { HarborSitesController } from './harbor-sites.controller';
import { HarborApiService } from '../../services/harbor-api.service';

@Module({
  imports: [TypeOrmModule.forFeature([HarborSite])],
  controllers: [HarborSitesController],
  providers: [HarborSitesService, HarborApiService],
  exports: [HarborSitesService, HarborApiService],
})
export class HarborSitesModule {}