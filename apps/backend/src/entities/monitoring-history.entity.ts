import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { MonitoredInstance } from './monitored-instance.entity';

@Entity('monitoring_history')
export class MonitoringHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'monitored_instance_id' })
  monitoredInstanceId: string;

  @Column({ name: 'check_time', type: 'timestamp' })
  checkTime: Date;

  @Column({ length: 50 })
  status: string; // healthy, warning, critical, error

  @Column({ name: 'response_time_ms', type: 'integer', nullable: true })
  responseTimeMs: number;

  @Column({ name: 'services_count', type: 'integer', nullable: true })
  servicesCount: number;

  @Column({ name: 'healthy_services', type: 'integer', nullable: true })
  healthyServices: number;

  @Column({ name: 'failed_services', type: 'integer', nullable: true })
  failedServices: number;

  @Column({ type: 'text', nullable: true })
  details: string; // JSON string with detailed status info

  @Column({ type: 'text', nullable: true })
  error: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => MonitoredInstance, (instance) => instance.monitoringHistory)
  @JoinColumn({ name: 'monitored_instance_id' })
  monitoredInstance: MonitoredInstance;
}