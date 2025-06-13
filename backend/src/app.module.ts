import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import {
  RancherSite,
  Environment,
  AppInstance,
  Service,
  SyncOperation,
  SyncHistory,
} from './entities';
import { SitesModule } from './modules/sites/sites.module';
import { EnvironmentsModule } from './modules/environments/environments.module';
import { AppInstancesModule } from './modules/app-instances/app-instances.module';
import { ServicesModule } from './modules/services/services.module';
import { RancherApiService } from './services/rancher-api.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: process.env.DATABASE_PATH || 'rancher-hub.db',
      entities: [
        RancherSite,
        Environment,
        AppInstance,
        Service,
        SyncOperation,
        SyncHistory,
      ],
      synchronize: process.env.NODE_ENV !== 'production',
      logging: process.env.NODE_ENV === 'development',
    }),
    SitesModule,
    EnvironmentsModule,
    AppInstancesModule,
    ServicesModule,
  ],
  controllers: [AppController],
  providers: [AppService, RancherApiService],
})
export class AppModule {}