export type TemplateType = 'test_connection' | 'daily_health_check' | 'critical_alert';

export interface MessageTemplate {
  id: string;
  templateType: TemplateType;
  templateName: string;
  messageTemplate: string;
  description?: string;
  availableVariables: string[];
  isActive: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMessageTemplateDto {
  templateType: TemplateType;
  templateName: string;
  messageTemplate: string;
  description?: string;
}

export interface UpdateMessageTemplateDto {
  templateName?: string;
  messageTemplate?: string;
  description?: string;
  isActive?: boolean;
}

export interface PreviewTemplateDto {
  templateType: TemplateType;
  messageTemplate: string;
  sampleData?: Record<string, any>;
}

export interface PreviewTemplateResponse {
  renderedMessage: string;
  sampleData: Record<string, any>;
}

export interface MonitoringConfig {
  id: string;
  telegramBotToken?: string;
  telegramChatId?: string;
  proxyHost?: string;
  proxyPort?: number;
  proxyUsername?: string;
  proxyPassword?: string;
  monitoringEnabled: boolean;
  alertThreshold: number;
  notificationSchedule: 'immediate' | 'hourly' | 'daily';
  taggedUsers?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TestTelegramConnectionDto {
  telegramBotToken: string;
  telegramChatId: string;
  proxyHost?: string;
  proxyPort?: number;
  proxyUsername?: string;
  proxyPassword?: string;
  taggedUsers?: string[];
}
