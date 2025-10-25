import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { AppInstance } from './app-instance.entity';
import { MonitoringHistory } from './monitoring-history.entity';
import { AlertHistory } from './alert-history.entity';

@Entity('monitored_instances')
export class MonitoredInstance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'app_instance_id' })
  appInstanceId: string;

  @Column({ name: 'monitoring_enabled', default: true })
  monitoringEnabled: boolean;

  @Column({ name: 'check_interval_minutes', type: 'integer', default: 60 })
  checkIntervalMinutes: number;

  @Column({ name: 'last_check_time', type: 'timestamp', nullable: true })
  lastCheckTime: Date;

  @Column({ name: 'last_status', length: 50, nullable: true })
  lastStatus: string;

  @Column({ name: 'consecutive_failures', type: 'integer', default: 0 })
  consecutiveFailures: number;

  @Column({ name: 'alert_sent', default: false })
  alertSent: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => AppInstance, (appInstance) => appInstance.monitoredInstances)
  @JoinColumn({ name: 'app_instance_id' })
  appInstance: AppInstance;

  @OneToMany(() => MonitoringHistory, (history) => history.monitoredInstance)
  monitoringHistory: MonitoringHistory[];

  @OneToMany(() => AlertHistory, (alert) => alert.monitoredInstance)
  alertHistory: AlertHistory[];
}