import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MonitoringController } from './monitoring.controller';
import { MonitoringService } from './monitoring.service';
import { TelegramService } from './telegram.service';
import { HealthCheckService } from './health-check.service';
import { MonitoringCronService } from './cron.service';
import { MonitoringConfig } from '../../entities/monitoring-config.entity';
import { MonitoredInstance } from '../../entities/monitored-instance.entity';
import { MonitoringHistory } from '../../entities/monitoring-history.entity';
import { AlertHistory } from '../../entities/alert-history.entity';
import { VisualStatusService } from './visual-status.service';
import { AppInstance } from '../../entities/app-instance.entity';
import { RancherApiService } from '../../services/rancher-api.service';
import { AuthModule } from '../auth/auth.module';
import { MessageTemplatesModule } from '../message-templates/message-templates.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MonitoringConfig,
      MonitoredInstance,
      MonitoringHistory,
      AlertHistory,
      AppInstance,
    ]),
    AuthModule,
    MessageTemplatesModule,
  ],
  controllers: [MonitoringController],
  providers: [
    MonitoringService,
    TelegramService,
    HealthCheckService,
    MonitoringCronService,
    RancherApiService,
    VisualStatusService,
  ],
  exports: [
    MonitoringService,
    TelegramService,
    HealthCheckService,
    MonitoringCronService,
    VisualStatusService,
  ],
})
export class MonitoringModule {}