import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { AppInstance } from './app-instance.entity';

@Entity('rancher_sites')
export class RancherSite {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ length: 500 })
  url: string;

  @Column({ type: 'text' })
  token: string;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => AppInstance, (appInstance) => appInstance.rancherSite)
  appInstances: AppInstance[];
}