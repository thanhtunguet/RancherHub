import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HarborSite } from '../../entities/harbor-site.entity';
import { HarborSitesService } from './harbor-sites.service';
import { HarborSitesController } from './harbor-sites.controller';
import { HarborApiService } from '../../services/harbor-api.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([HarborSite]), AuthModule],
  controllers: [HarborSitesController],
  providers: [HarborSitesService, HarborApiService],
  exports: [HarborSitesService, HarborApiService],
})
export class HarborSitesModule {}