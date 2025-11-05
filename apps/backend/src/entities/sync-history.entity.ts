import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { SyncOperation } from './sync-operation.entity';

@Entity('sync_history')
export class SyncHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'sync_operation_id' })
  syncOperationId: string;

  @Column({ name: 'service_id' })
  serviceId: string;

  @Column({ name: 'service_name', length: 255, nullable: true })
  serviceName: string;

  @Column({ name: 'workload_type', length: 100, nullable: true })
  workloadType: string;

  @Column({ name: 'source_app_instance_id' })
  sourceAppInstanceId: string;

  @Column({ name: 'source_environment_name', length: 255, nullable: true })
  sourceEnvironmentName: string;

  @Column({ name: 'source_cluster', length: 255, nullable: true })
  sourceCluster: string;

  @Column({ name: 'source_namespace', length: 255, nullable: true })
  sourceNamespace: string;

  @Column({ name: 'target_app_instance_id' })
  targetAppInstanceId: string;

  @Column({ name: 'target_environment_name', length: 255, nullable: true })
  targetEnvironmentName: string;

  @Column({ name: 'target_cluster', length: 255, nullable: true })
  targetCluster: string;

  @Column({ name: 'target_namespace', length: 255, nullable: true })
  targetNamespace: string;

  @Column({ name: 'previous_image_tag', length: 255, nullable: true })
  previousImageTag: string;

  @Column({ name: 'new_image_tag', length: 255 })
  newImageTag: string;

  @Column({ name: 'container_name', length: 255, nullable: true })
  containerName: string;

  @Column({ type: 'json', nullable: true })
  configChanges: any;

  @Column({ length: 50 })
  status: string;

  @Column({ type: 'text', nullable: true })
  error: string;

  @Column({ name: 'duration_ms', type: 'integer', nullable: true })
  durationMs: number;

  @Column({ name: 'initiated_by', length: 255, nullable: true })
  initiatedBy: string;

  @Column({ type: 'timestamp' })
  timestamp: Date;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => SyncOperation, (operation) => operation.syncHistory)
  @JoinColumn({ name: 'sync_operation_id' })
  syncOperation: SyncOperation;
}