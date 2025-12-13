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
  MessageTemplate,
  TrustedDevice,
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
import { MessageTemplatesModule } from './modules/message-templates/message-templates.module';
import { TrustedDevicesModule } from './modules/trusted-devices/trusted-devices.module';
import { RancherApiService } from './services/rancher-api.service';
import { HarborApiService } from './services/harbor-api.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRoot(
      process.env.DATABASE_TYPE === 'postgres'
        ? {
            type: 'postgres',
            host: process.env.DATABASE_HOST || 'localhost',
            port: parseInt(process.env.DATABASE_PORT || '5432'),
            username: process.env.DATABASE_USERNAME || 'rancher_hub',
            password: process.env.DATABASE_PASSWORD || 'rancher_hub_password',
            database: process.env.DATABASE_NAME || 'rancher_hub',
            ssl:
              process.env.DATABASE_SSL === 'true'
                ? { rejectUnauthorized: false }
                : false,
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
              MessageTemplate,
              TrustedDevice,
            ],
            synchronize: process.env.DATABASE_SYNCHRONIZE === 'true',
            logging: process.env.NODE_ENV === 'development',
          }
        : {
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
              MessageTemplate,
              TrustedDevice,
            ],
            synchronize: process.env.DATABASE_SYNCHRONIZE === 'true',
            logging:
              process.env.NODE_ENV === 'development' &&
              process.env.DATABASE_LOGGING === 'true',
          },
    ),
    SitesModule,
    HarborSitesModule,
    EnvironmentsModule,
    AppInstancesModule,
    ServicesModule,
    MonitoringModule,
    ConfigMapsModule,
    AuthModule,
    UsersModule,
    MessageTemplatesModule,
    TrustedDevicesModule,
  ],
  controllers: [AppController],
  providers: [AppService, RancherApiService, HarborApiService],
})
export class AppModule {}
