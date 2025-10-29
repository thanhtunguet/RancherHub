import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('message_templates')
export class MessageTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'template_type', type: 'varchar', length: 50, unique: true })
  templateType: string; // 'test_connection', 'daily_health_check', 'critical_alert'

  @Column({ name: 'template_name', type: 'varchar', length: 255 })
  templateName: string; // Display name for UI

  @Column({ name: 'message_template', type: 'text' })
  messageTemplate: string; // The actual template with placeholders

  @Column({ name: 'description', type: 'text', nullable: true })
  description: string; // Description of what this template is for

  @Column({ name: 'available_variables', type: 'simple-json', nullable: true })
  availableVariables: string[]; // List of available variables for this template

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean; // Whether this template is currently in use

  @Column({ name: 'is_default', type: 'boolean', default: false })
  isDefault: boolean; // System default template (cannot be deleted)

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
