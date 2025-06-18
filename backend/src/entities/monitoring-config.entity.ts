import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('monitoring_configs')
export class MonitoringConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'telegram_bot_token', length: 255, nullable: true })
  telegramBotToken: string;

  @Column({ name: 'telegram_chat_id', length: 255, nullable: true })
  telegramChatId: string;

  @Column({ name: 'proxy_host', length: 255, nullable: true })
  proxyHost: string;

  @Column({ name: 'proxy_port', type: 'integer', nullable: true })
  proxyPort: number;

  @Column({ name: 'proxy_username', length: 255, nullable: true })
  proxyUsername: string;

  @Column({ name: 'proxy_password', length: 255, nullable: true })
  proxyPassword: string;

  @Column({ name: 'monitoring_enabled', default: true })
  monitoringEnabled: boolean;

  @Column({ name: 'alert_threshold', type: 'integer', default: 3 })
  alertThreshold: number; // Number of consecutive failures before alert

  @Column({ name: 'notification_schedule', length: 50, default: 'daily' })
  notificationSchedule: string; // daily, hourly, immediate

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}