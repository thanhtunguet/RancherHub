import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { MessageTemplatesService } from './modules/message-templates/message-templates.service';

@Injectable()
export class AppService implements OnModuleInit {
  private readonly logger = new Logger(AppService.name);

  constructor(
    private readonly messageTemplatesService: MessageTemplatesService,
  ) {}

  async onModuleInit() {
    // Seed default message templates on application startup
    try {
      await this.messageTemplatesService.seedDefaultTemplates();
      this.logger.log('Default message templates seeded successfully');
    } catch (error) {
      this.logger.error(`Failed to seed message templates: ${error.message}`);
    }
  }

  getHello(): string {
    return 'Rancher Hub API is running!';
  }

  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'Rancher Hub Backend',
      version: '1.0.0',
    };
  }
}
