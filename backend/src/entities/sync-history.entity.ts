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

  @Column({ name: 'source_app_instance_id' })
  sourceAppInstanceId: string;

  @Column({ name: 'target_app_instance_id' })
  targetAppInstanceId: string;

  @Column({ name: 'previous_image_tag', length: 255, nullable: true })
  previousImageTag: string;

  @Column({ name: 'new_image_tag', length: 255 })
  newImageTag: string;

  @Column({ length: 50 })
  status: string;

  @Column({ type: 'text', nullable: true })
  error: string;

  @Column({ type: 'datetime' })
  timestamp: Date;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => SyncOperation, (operation) => operation.syncHistory)
  @JoinColumn({ name: 'sync_operation_id' })
  syncOperation: SyncOperation;
}