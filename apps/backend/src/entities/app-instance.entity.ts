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
import { RancherSite } from './rancher-site.entity';
import { Environment } from './environment.entity';
import { Service } from './service.entity';
import { MonitoredInstance } from './monitored-instance.entity';

@Entity('app_instances')
export class AppInstance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ length: 255 })
  cluster: string;

  @Column({ length: 255 })
  namespace: string;

  @Column({ name: 'rancher_site_id' })
  rancherSiteId: string;

  @Column({ name: 'environment_id' })
  environmentId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => RancherSite, (site) => site.appInstances)
  @JoinColumn({ name: 'rancher_site_id' })
  rancherSite: RancherSite;

  @ManyToOne(() => Environment, (env) => env.appInstances)
  @JoinColumn({ name: 'environment_id' })
  environment: Environment;

  @OneToMany(() => Service, (service) => service.appInstance)
  services: Service[];

  @OneToMany(() => MonitoredInstance, (instance) => instance.appInstance)
  monitoredInstances: MonitoredInstance[];
}
