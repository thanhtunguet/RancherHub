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
import { GenericClusterSite } from './generic-cluster-site.entity';
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

  @Column({
    name: 'cluster_type',
    type: 'varchar',
    length: 50,
    default: 'rancher',
  })
  clusterType: 'rancher' | 'generic';

  @Column({ name: 'rancher_site_id', nullable: true })
  rancherSiteId: string | null;

  @Column({ name: 'generic_cluster_site_id', nullable: true })
  genericClusterSiteId: string | null;

  @Column({ name: 'environment_id' })
  environmentId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => RancherSite, (site) => site.appInstances, { nullable: true })
  @JoinColumn({ name: 'rancher_site_id' })
  rancherSite: RancherSite | null;

  @ManyToOne(() => GenericClusterSite, (site) => site.appInstances, {
    nullable: true,
  })
  @JoinColumn({ name: 'generic_cluster_site_id' })
  genericClusterSite: GenericClusterSite | null;

  @ManyToOne(() => Environment, (env) => env.appInstances)
  @JoinColumn({ name: 'environment_id' })
  environment: Environment;

  @OneToMany(() => Service, (service) => service.appInstance)
  services: Service[];

  @OneToMany(() => MonitoredInstance, (instance) => instance.appInstance)
  monitoredInstances: MonitoredInstance[];
}
