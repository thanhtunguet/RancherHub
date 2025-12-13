import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { AppInstance } from './app-instance.entity';

@Entity('services')
@Unique(['name', 'appInstanceId'])
export class Service {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ name: 'app_instance_id' })
  appInstanceId: string;

  @Column({ length: 50, default: 'unknown' })
  status: string;

  @Column({ default: 1 })
  replicas: number;

  @Column({ name: 'available_replicas', default: 0 })
  availableReplicas: number;

  @Column({ name: 'image_tag', length: 255, nullable: true })
  imageTag: string;

  @Column({ name: 'workload_type', length: 50, default: 'Deployment' })
  workloadType: string;

  @Column({ name: 'last_synced', type: 'timestamp', nullable: true })
  lastSynced: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => AppInstance, (appInstance) => appInstance.services)
  @JoinColumn({ name: 'app_instance_id' })
  appInstance: AppInstance;
}
