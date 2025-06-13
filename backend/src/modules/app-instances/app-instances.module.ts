import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppInstance } from '../../entities/app-instance.entity';
import { RancherSite } from '../../entities/rancher-site.entity';
import { Environment } from '../../entities/environment.entity';
import { AppInstancesService } from './app-instances.service';
import { AppInstancesController } from './app-instances.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AppInstance, RancherSite, Environment])],
  controllers: [AppInstancesController],
  providers: [AppInstancesService],
  exports: [AppInstancesService],
})
export class AppInstancesModule {}