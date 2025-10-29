import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MessageTemplate } from '../../entities/message-template.entity';
import { CreateMessageTemplateDto } from './dto/create-message-template.dto';
import { UpdateMessageTemplateDto } from './dto/update-message-template.dto';
import { PreviewTemplateDto } from './dto/preview-template.dto';

@Injectable()
export class MessageTemplatesService {
  constructor(
    @InjectRepository(MessageTemplate)
    private readonly messageTemplateRepository: Repository<MessageTemplate>,
  ) {}

  /**
   * Find all message templates
   */
  async findAll(): Promise<MessageTemplate[]> {
    return this.messageTemplateRepository.find({
      order: { templateType: 'ASC' },
    });
  }

  /**
   * Find template by ID
   */
  async findOne(id: string): Promise<MessageTemplate> {
    const template = await this.messageTemplateRepository.findOne({
      where: { id },
    });

    if (!template) {
      throw new NotFoundException(`Message template with ID ${id} not found`);
    }

    return template;
  }

  /**
   * Find template by type
   */
  async findByType(templateType: string): Promise<MessageTemplate> {
    const template = await this.messageTemplateRepository.findOne({
      where: { templateType, isActive: true },
    });

    if (!template) {
      throw new NotFoundException(`Active template of type '${templateType}' not found`);
    }

    return template;
  }

  /**
   * Create new message template
   */
  async create(dto: CreateMessageTemplateDto): Promise<MessageTemplate> {
    // Check if template type already exists
    const existing = await this.messageTemplateRepository.findOne({
      where: { templateType: dto.templateType },
    });

    if (existing) {
      throw new ConflictException(`Template with type '${dto.templateType}' already exists`);
    }

    const template = this.messageTemplateRepository.create({
      ...dto,
      availableVariables: this.getAvailableVariables(dto.templateType),
      isDefault: false,
    });

    return this.messageTemplateRepository.save(template);
  }

  /**
   * Update message template
   */
  async update(id: string, dto: UpdateMessageTemplateDto): Promise<MessageTemplate> {
    const template = await this.findOne(id);

    Object.assign(template, dto);

    return this.messageTemplateRepository.save(template);
  }

  /**
   * Delete message template
   */
  async delete(id: string): Promise<void> {
    const template = await this.findOne(id);

    if (template.isDefault) {
      throw new BadRequestException('Cannot delete default system template. Use restore instead.');
    }

    await this.messageTemplateRepository.remove(template);
  }

  /**
   * Restore template to default
   */
  async restoreDefault(id: string): Promise<MessageTemplate> {
    const template = await this.findOne(id);

    const defaultTemplate = this.getDefaultTemplate(template.templateType);

    template.templateName = defaultTemplate.templateName;
    template.messageTemplate = defaultTemplate.messageTemplate;
    template.description = defaultTemplate.description;
    template.isActive = true;

    return this.messageTemplateRepository.save(template);
  }

  /**
   * Render template with variables
   */
  async renderTemplate(templateType: string, variables: Record<string, any>): Promise<string> {
    const template = await this.findByType(templateType);
    return this.render(template.messageTemplate, variables);
  }

  /**
   * Preview template with sample data
   */
  previewTemplate(dto: PreviewTemplateDto): string {
    const sampleData = dto.sampleData || this.getSampleData(dto.templateType);
    return this.render(dto.messageTemplate, sampleData);
  }

  /**
   * Format tagged users as "@user1 @user2 @user3"
   */
  formatTaggedUsers(usernames: string[]): string {
    if (!usernames || usernames.length === 0) {
      return '';
    }

    return usernames
      .map(username => {
        // Remove @ if already present, then add it
        const cleanUsername = username.replace(/^@/, '');
        return `@${cleanUsername}`;
      })
      .join(' ');
  }

  /**
   * Render template string with variables
   */
  private render(template: string, variables: Record<string, any>): string {
    let result = template;

    // Replace all variables {{variable_name}}
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, String(value || ''));
    });

    // Remove any unreplaced variables (safety)
    result = result.replace(/{{[^}]+}}/g, '');

    return result.trim();
  }

  /**
   * Get available variables for each template type
   */
  private getAvailableVariables(templateType: string): string[] {
    const variablesMap: Record<string, string[]> = {
      test_connection: ['timestamp', 'tagged_users'],
      daily_health_check: ['date', 'time', 'visual_summary', 'avg_response_time', 'tagged_users'],
      critical_alert: ['date', 'time', 'visual_alert', 'tagged_users'],
    };

    return variablesMap[templateType] || [];
  }

  /**
   * Get sample data for preview
   */
  private getSampleData(templateType: string): Record<string, any> {
    const now = new Date();
    const sampleTaggedUsers = '@thangld19 @tungpt @devops_team';

    const sampleDataMap: Record<string, Record<string, any>> = {
      test_connection: {
        timestamp: now.toISOString(),
        tagged_users: sampleTaggedUsers,
      },
      daily_health_check: {
        date: now.toISOString().split('T')[0],
        time: now.toTimeString().split(' ')[0],
        visual_summary: `📊 **Overall Status**: ✅ All Systems Healthy (3/3 instances)\n\n**Environment: Production**\n• api-server: ✅ healthy (5/5 services)\n• web-app: ✅ healthy (3/3 services)\n• database: ✅ healthy (2/2 services)`,
        avg_response_time: '1.2',
        tagged_users: sampleTaggedUsers,
      },
      critical_alert: {
        date: now.toISOString().split('T')[0],
        time: now.toTimeString().split(' ')[0],
        visual_alert: `**Service Failure Detected**\n• Environment: Production\n• Instance: api-server\n• Status: ❌ critical\n\n**Failed Services:**\n• auth-service (deployment): crashlooping [0/3]\n• payment-api (deployment): unhealthy [1/3]`,
        tagged_users: sampleTaggedUsers,
      },
    };

    return sampleDataMap[templateType] || {};
  }

  /**
   * Get default template configuration
   */
  private getDefaultTemplate(templateType: string): Partial<MessageTemplate> {
    const defaults: Record<string, Partial<MessageTemplate>> = {
      test_connection: {
        templateName: 'Test Connection',
        messageTemplate: `🔍 **Telegram Connection Test** - {{timestamp}}

This is a test message from RancherHub monitoring system.

{{tagged_users}}`,
        description: 'Sent when testing Telegram connection',
      },
      daily_health_check: {
        templateName: 'Daily Health Check Report',
        messageTemplate: `🔍 **Daily Health Check Report** - {{date}} {{time}}

{{visual_summary}}

📈 **Performance**: Avg response time {{avg_response_time}}s
⏰ Next check: Tomorrow 06:00

{{tagged_users}}`,
        description: 'Sent daily at 11PM with system health summary',
      },
      critical_alert: {
        templateName: 'Critical Alert',
        messageTemplate: `🚨 **CRITICAL ALERT** - {{date}} {{time}}

{{visual_alert}}

📞 Contact DevOps team immediately

{{tagged_users}}`,
        description: 'Sent immediately when critical service failure is detected',
      },
    };

    return defaults[templateType] || {};
  }

  /**
   * Seed default templates on application startup
   */
  async seedDefaultTemplates(): Promise<void> {
    const templateTypes = ['test_connection', 'daily_health_check', 'critical_alert'];

    for (const templateType of templateTypes) {
      const existing = await this.messageTemplateRepository.findOne({
        where: { templateType },
      });

      if (!existing) {
        const defaultTemplate = this.getDefaultTemplate(templateType);
        const template = this.messageTemplateRepository.create({
          templateType,
          ...defaultTemplate,
          availableVariables: this.getAvailableVariables(templateType),
          isDefault: true,
          isActive: true,
        });

        await this.messageTemplateRepository.save(template);
      }
    }
  }
}
