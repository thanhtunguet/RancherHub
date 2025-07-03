import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MonitoringConfig } from '../../entities/monitoring-config.entity';
import { MonitoredInstance } from '../../entities/monitored-instance.entity';
import { MonitoringHistory } from '../../entities/monitoring-history.entity';
import { AlertHistory } from '../../entities/alert-history.entity';
import { AppInstance } from '../../entities/app-instance.entity';
import { CreateMonitoringConfigDto } from './dto/create-monitoring-config.dto';
import { UpdateMonitoringConfigDto } from './dto/update-monitoring-config.dto';
import { CreateMonitoredInstanceDto } from './dto/create-monitored-instance.dto';
import { UpdateMonitoredInstanceDto } from './dto/update-monitored-instance.dto';
import { TelegramService } from './telegram.service';

@Injectable()
export class MonitoringService {
  private readonly logger = new Logger(MonitoringService.name);

  constructor(
    @InjectRepository(MonitoringConfig)
    private readonly monitoringConfigRepository: Repository<MonitoringConfig>,
    @InjectRepository(MonitoredInstance)
    private readonly monitoredInstanceRepository: Repository<MonitoredInstance>,
    @InjectRepository(MonitoringHistory)
    private readonly monitoringHistoryRepository: Repository<MonitoringHistory>,
    @InjectRepository(AlertHistory)
    private readonly alertHistoryRepository: Repository<AlertHistory>,
    @InjectRepository(AppInstance)
    private readonly appInstanceRepository: Repository<AppInstance>,
    private readonly telegramService: TelegramService,
  ) {}

  // Monitoring Configuration
  async getConfig(): Promise<MonitoringConfig | null> {
    try {
      const configs = await this.monitoringConfigRepository.find({
        order: { createdAt: 'DESC' },
        take: 1,
      });
      return configs.length > 0 ? configs[0] : null;
    } catch (error) {
      this.logger.error('Failed to get monitoring config:', error);
      return null;
    }
  }

  async createOrUpdateConfig(dto: CreateMonitoringConfigDto): Promise<MonitoringConfig> {
    const existingConfig = await this.getConfig();

    if (existingConfig) {
      Object.assign(existingConfig, dto);
      return this.monitoringConfigRepository.save(existingConfig);
    } else {
      const config = this.monitoringConfigRepository.create(dto);
      return this.monitoringConfigRepository.save(config);
    }
  }

  async updateConfig(dto: UpdateMonitoringConfigDto): Promise<MonitoringConfig> {
    const config = await this.getConfig();
    if (!config) {
      throw new NotFoundException('Monitoring configuration not found');
    }

    Object.assign(config, dto);
    return this.monitoringConfigRepository.save(config);
  }

  async testTelegramConnection(dto: {
    telegramBotToken: string;
    telegramChatId: string;
    proxyHost?: string;
    proxyPort?: number;
    proxyUsername?: string;
    proxyPassword?: string;
  }): Promise<{ success: boolean; message: string }> {
    try {
      await this.telegramService.testConnection(dto);
      return {
        success: true,
        message: 'Telegram connection test successful',
      };
    } catch (error) {
      this.logger.error('Telegram connection test failed:', error.message);
      return {
        success: false,
        message: error.message,
      };
    }
  }

  // Monitored Instances
  async getMonitoredInstances(): Promise<MonitoredInstance[]> {
    return this.monitoredInstanceRepository.find({
      relations: ['appInstance', 'appInstance.environment'],
      order: { createdAt: 'DESC' },
    });
  }

  async getMonitoredInstance(id: string): Promise<MonitoredInstance> {
    const instance = await this.monitoredInstanceRepository.findOne({
      where: { id },
      relations: ['appInstance', 'appInstance.environment'],
    });

    if (!instance) {
      throw new NotFoundException('Monitored instance not found');
    }

    return instance;
  }

  async createMonitoredInstance(dto: CreateMonitoredInstanceDto): Promise<MonitoredInstance> {
    // Verify app instance exists
    const appInstance = await this.appInstanceRepository.findOne({
      where: { id: dto.appInstanceId },
    });

    if (!appInstance) {
      throw new NotFoundException('App instance not found');
    }

    // Check if already monitored
    const existing = await this.monitoredInstanceRepository.findOne({
      where: { appInstanceId: dto.appInstanceId },
    });

    if (existing) {
      throw new Error('App instance is already being monitored');
    }

    const monitoredInstance = this.monitoredInstanceRepository.create(dto);
    return this.monitoredInstanceRepository.save(monitoredInstance);
  }

  async updateMonitoredInstance(
    id: string,
    dto: UpdateMonitoredInstanceDto,
  ): Promise<MonitoredInstance> {
    const instance = await this.getMonitoredInstance(id);
    Object.assign(instance, dto);
    return this.monitoredInstanceRepository.save(instance);
  }

  async deleteMonitoredInstance(id: string): Promise<void> {
    const instance = await this.getMonitoredInstance(id);
    await this.monitoredInstanceRepository.remove(instance);
  }

  // Monitoring History
  async getMonitoringHistory(
    instanceId?: string,
    days: number = 7,
  ): Promise<MonitoringHistory[]> {
    const queryBuilder = this.monitoringHistoryRepository.createQueryBuilder('history');

    if (instanceId) {
      queryBuilder.where('history.monitoredInstanceId = :instanceId', { instanceId });
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    queryBuilder
      .andWhere('history.checkTime >= :cutoffDate', { cutoffDate })
      .orderBy('history.checkTime', 'DESC')
      .limit(1000);

    return queryBuilder.getMany();
  }

  async createMonitoringHistory(data: {
    monitoredInstanceId: string;
    status: string;
    responseTimeMs?: number;
    servicesCount?: number;
    healthyServices?: number;
    failedServices?: number;
    details?: string;
    error?: string;
  }): Promise<MonitoringHistory> {
    const history = this.monitoringHistoryRepository.create({
      ...data,
      checkTime: new Date(),
    });

    return this.monitoringHistoryRepository.save(history);
  }

  // Alert History
  async getAlertHistory(
    instanceId?: string,
    resolved?: boolean,
  ): Promise<AlertHistory[]> {
    const queryBuilder = this.alertHistoryRepository.createQueryBuilder('alert');

    if (instanceId) {
      queryBuilder.where('alert.monitoredInstanceId = :instanceId', { instanceId });
    }

    if (resolved !== undefined) {
      queryBuilder.andWhere('alert.resolved = :resolved', { resolved });
    }

    queryBuilder.orderBy('alert.createdAt', 'DESC').limit(100);

    return queryBuilder.getMany();
  }

  async createAlert(data: {
    monitoredInstanceId: string;
    alertType: string;
    severity: string;
    message: string;
  }): Promise<AlertHistory> {
    const alert = this.alertHistoryRepository.create(data);
    return this.alertHistoryRepository.save(alert);
  }

  async resolveAlert(id: string): Promise<AlertHistory> {
    const alert = await this.alertHistoryRepository.findOne({ where: { id } });
    
    if (!alert) {
      throw new NotFoundException('Alert not found');
    }

    alert.resolved = true;
    alert.resolvedAt = new Date();
    
    return this.alertHistoryRepository.save(alert);
  }

  async updateMonitoredInstanceStatus(
    instanceId: string,
    status: string,
    consecutiveFailures: number = 0,
  ): Promise<void> {
    await this.monitoredInstanceRepository.update(instanceId, {
      lastStatus: status,
      lastCheckTime: new Date(),
      consecutiveFailures,
      alertSent: consecutiveFailures >= 3,
    });
  }

  async getActiveMonitoredInstances(): Promise<MonitoredInstance[]> {
    return this.monitoredInstanceRepository.find({
      where: { monitoringEnabled: true },
      relations: ['appInstance', 'appInstance.environment', 'appInstance.rancherSite'],
    });
  }
}