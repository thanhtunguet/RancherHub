import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import {
  RancherSite,
  HarborSite,
  Environment,
  AppInstance,
  Service,
  SyncOperation,
  SyncHistory,
  MonitoringConfig,
  MonitoredInstance,
  MonitoringHistory,
  AlertHistory,
  User,
} from './entities';
import { SitesModule } from './modules/sites/sites.module';
import { HarborSitesModule } from './modules/harbor-sites/harbor-sites.module';
import { EnvironmentsModule } from './modules/environments/environments.module';
import { AppInstancesModule } from './modules/app-instances/app-instances.module';
import { ServicesModule } from './modules/services/services.module';
import { MonitoringModule } from './modules/monitoring/monitoring.module';
import { ConfigMapsModule } from './modules/configmaps/configmaps.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { RancherApiService } from './services/rancher-api.service';
import { HarborApiService } from './services/harbor-api.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: process.env.DATABASE_PATH || 'rancher-hub.db',
      entities: [
        RancherSite,
        HarborSite,
        Environment,
        AppInstance,
        Service,
        SyncOperation,
        SyncHistory,
        MonitoringConfig,
        MonitoredInstance,
        MonitoringHistory,
        AlertHistory,
        User,
      ],
      synchronize: process.env.NODE_ENV !== 'production',
      logging: process.env.NODE_ENV === 'development',
    }),
    SitesModule,
    HarborSitesModule,
    EnvironmentsModule,
    AppInstancesModule,
    ServicesModule,
    MonitoringModule,
    ConfigMapsModule,
    AuthModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [AppService, RancherApiService, HarborApiService],
})
export class AppModule {}