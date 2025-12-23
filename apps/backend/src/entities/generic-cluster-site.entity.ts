import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { AppInstance } from './app-instance.entity';

@Entity('generic_cluster_sites')
export class GenericClusterSite {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'text' })
  kubeconfig: string;

  @Column({ length: 255, nullable: true })
  clusterName: string;

  @Column({ length: 500, nullable: true })
  serverUrl: string;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => AppInstance, (appInstance) => appInstance.genericClusterSite)
  appInstances: AppInstance[];
}
