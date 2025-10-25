import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { MonitoredInstance } from './monitored-instance.entity';

@Entity('alert_history')
export class AlertHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'monitored_instance_id' })
  monitoredInstanceId: string;

  @Column({ length: 50 })
  alertType: string; // status_change, service_failure, performance_degradation

  @Column({ length: 50 })
  severity: string; // info, warning, critical

  @Column({ type: 'text' })
  message: string;

  @Column({ name: 'telegram_sent', default: false })
  telegramSent: boolean;

  @Column({ name: 'telegram_message_id', length: 255, nullable: true })
  telegramMessageId: string;

  @Column({ name: 'resolved', default: false })
  resolved: boolean;

  @Column({ name: 'resolved_at', type: 'timestamp', nullable: true })
  resolvedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => MonitoredInstance, (instance) => instance.alertHistory)
  @JoinColumn({ name: 'monitored_instance_id' })
  monitoredInstance: MonitoredInstance;
}