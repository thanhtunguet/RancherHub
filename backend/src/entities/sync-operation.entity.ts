import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { SyncHistory } from './sync-history.entity';

@Entity('sync_operations')
export class SyncOperation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'source_environment_id' })
  sourceEnvironmentId: string;

  @Column({ name: 'target_environment_id' })
  targetEnvironmentId: string;

  @Column({ type: 'json' })
  serviceIds: string[];

  @Column({ length: 50, default: 'pending' })
  status: string;

  @Column({ name: 'start_time', type: 'datetime' })
  startTime: Date;

  @Column({ name: 'end_time', type: 'datetime', nullable: true })
  endTime: Date;

  @Column({ name: 'initiated_by', length: 255 })
  initiatedBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => SyncHistory, (history) => history.syncOperation)
  syncHistory: SyncHistory[];
}