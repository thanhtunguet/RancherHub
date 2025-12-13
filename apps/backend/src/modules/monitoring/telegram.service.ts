import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosRequestConfig } from 'axios';
import { SocksProxyAgent } from 'socks-proxy-agent';
import * as FormData from 'form-data';
import { MonitoringConfig } from '../../entities/monitoring-config.entity';
import { VisualStatusService } from './visual-status.service';
import { MessageTemplatesService } from '../message-templates/message-templates.service';
import {
  HealthCheckResult,
  TelegramTestConfig,
  CriticalAlert,
  EnvironmentGroupedResults,
  WorkloadDetails,
} from './types/monitoring.types';

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);
  constructor(
    private readonly visualStatus: VisualStatusService,
    private readonly messageTemplatesService: MessageTemplatesService,
  ) {}

  async sendMessage(
    chatId: string,
    message: string,
    config: MonitoringConfig,
  ): Promise<string> {
    const axiosConfig = this.createAxiosConfig(config);
    axiosConfig.headers = {
      ...axiosConfig.headers,
      'Content-Type': 'application/x-www-form-urlencoded',
    };

    const formData = new URLSearchParams({
      chat_id: chatId,
      text: message,
      parse_mode: 'Markdown',
    });

    try {
      const response = await axios.post(
        `https://api.telegram.org/bot${config.telegramBotToken}/sendMessage`,
        formData.toString(),
        axiosConfig,
      );

      this.logger.log(`Message sent to Telegram chat ${chatId}`);
      return response.data.result.message_id.toString();
    } catch (error) {
      const errorMessage = this.extractTelegramError(error);
      this.logger.error(`Failed to send Telegram message: ${errorMessage}`);
      throw new Error(errorMessage);
    }
  }

  async sendPhoto(
    chatId: string,
    imageBuffer: Buffer,
    caption?: string,
    config?: MonitoringConfig,
  ): Promise<string> {
    const axiosConfig = this.createAxiosConfig(config);

    // Use FormData for multipart/form-data
    const formData = new FormData();

    formData.append('chat_id', chatId);
    formData.append('photo', imageBuffer, {
      filename: 'status-report.png',
      contentType: 'image/png',
    });

    if (caption) {
      formData.append('caption', caption);
      formData.append('parse_mode', 'Markdown');
    }

    axiosConfig.headers = {
      ...axiosConfig.headers,
      ...formData.getHeaders(),
    };

    try {
      const response = await axios.post(
        `https://api.telegram.org/bot${config.telegramBotToken}/sendPhoto`,
        formData,
        axiosConfig,
      );

      this.logger.log(`Photo sent to Telegram chat ${chatId}`);
      return response.data.result.message_id.toString();
    } catch (error) {
      const errorMessage = this.extractTelegramError(error);
      this.logger.error(`Failed to send Telegram photo: ${errorMessage}`);
      throw new Error(errorMessage);
    }
  }

  async sendMessageWithImage(
    chatId: string,
    message: string,
    imageBuffer: Buffer,
    config: MonitoringConfig,
  ): Promise<string> {
    try {
      // Send the image with the message as caption
      return await this.sendPhoto(chatId, imageBuffer, message, config);
    } catch (error) {
      this.logger.error(
        `Failed to send message with image, falling back to text: ${error.message}`,
      );
      // Fallback to text message if image fails
      return await this.sendMessage(chatId, message, config);
    }
  }

  async testConnection(config: TelegramTestConfig): Promise<boolean> {
    const axiosConfig = this.createAxiosConfigFromDto(config);
    axiosConfig.headers = {
      ...axiosConfig.headers,
      'Content-Type': 'application/x-www-form-urlencoded',
    };

    try {
      // Render message from template
      const taggedUsers = this.messageTemplatesService.formatTaggedUsers(
        config.taggedUsers || [],
      );
      const testMessage = await this.messageTemplatesService.renderTemplate(
        'test_connection',
        {
          timestamp: new Date().toISOString(),
          tagged_users: taggedUsers,
        },
      );

      const formData = new URLSearchParams({
        chat_id: config.telegramChatId,
        text: testMessage,
        parse_mode: 'Markdown',
      });

      const response = await axios.post(
        `https://api.telegram.org/bot${config.telegramBotToken}/sendMessage`,
        formData.toString(),
        axiosConfig,
      );

      this.logger.log(
        `Test message sent successfully to chat ${config.telegramChatId}`,
      );
      return true;
    } catch (error) {
      const errorMessage = this.extractTelegramError(error);
      this.logger.error(`Telegram connection test failed: ${errorMessage}`);
      throw new Error(errorMessage);
    }
  }

  /**
   * Extract detailed error message from Telegram API error response
   */
  private extractTelegramError(error: any): string {
    // Check if it's an axios error with response data
    if (error.response?.data) {
      const data = error.response.data;

      // Telegram API error format: { ok: false, error_code: number, description: string }
      if (data.description) {
        return `Telegram API error (${data.error_code || error.response.status}): ${data.description}`;
      }

      // If response data is a string
      if (typeof data === 'string') {
        return `Telegram API error (${error.response.status}): ${data}`;
      }

      // If we have the full response but no description, stringify it
      return `Telegram API error (${error.response.status}): ${JSON.stringify(data)}`;
    }

    // Network or other errors
    if (error.code) {
      return `Network error (${error.code}): ${error.message}`;
    }

    // Fallback to generic error message
    return `Telegram connection failed: ${error.message}`;
  }

  private createAxiosConfig(config: MonitoringConfig): AxiosRequestConfig {
    const axiosConfig: AxiosRequestConfig = {
      timeout: 10000,
    };

    if (config.proxyHost && config.proxyPort) {
      const proxyUrl = this.buildProxyUrl(
        config.proxyHost,
        config.proxyPort,
        config.proxyUsername,
        config.proxyPassword,
      );

      axiosConfig.httpsAgent = new SocksProxyAgent(proxyUrl);
      axiosConfig.httpAgent = new SocksProxyAgent(proxyUrl);
    }

    return axiosConfig;
  }

  private createAxiosConfigFromDto(config: {
    proxyHost?: string;
    proxyPort?: number;
    proxyUsername?: string;
    proxyPassword?: string;
  }): AxiosRequestConfig {
    const axiosConfig: AxiosRequestConfig = {
      timeout: 10000,
    };

    if (config.proxyHost && config.proxyPort) {
      const proxyUrl = this.buildProxyUrl(
        config.proxyHost,
        config.proxyPort,
        config.proxyUsername,
        config.proxyPassword,
      );

      axiosConfig.httpsAgent = new SocksProxyAgent(proxyUrl);
      axiosConfig.httpAgent = new SocksProxyAgent(proxyUrl);
    }

    return axiosConfig;
  }

  private buildProxyUrl(
    host: string,
    port: number,
    username?: string,
    password?: string,
  ): string {
    let proxyUrl = `socks://${host}:${port}`;

    if (username && password) {
      proxyUrl = `socks://${username}:${password}@${host}:${port}`;
    }

    return proxyUrl;
  }

  async sendHealthCheckSummaryWithVisual(
    chatId: string,
    results: HealthCheckResult[],
    config: MonitoringConfig,
  ): Promise<string> {
    try {
      // Generate visual status representation
      const visualSummary =
        this.visualStatus.generateHealthCheckVisualSummary(results);

      const now = new Date();
      const avgResponseTime =
        results.reduce((sum, r) => sum + (r.responseTimeMs || 0), 0) /
        results.length;
      const taggedUsers = this.messageTemplatesService.formatTaggedUsers(
        config.taggedUsers || [],
      );

      // Render message from template
      const message = await this.messageTemplatesService.renderTemplate(
        'daily_health_check',
        {
          date: now.toISOString().split('T')[0],
          time: now.toTimeString().split(' ')[0],
          visual_summary: visualSummary,
          avg_response_time: (avgResponseTime / 1000).toFixed(1),
          tagged_users: taggedUsers,
        },
      );

      return await this.sendMessage(chatId, message, config);
    } catch (error) {
      this.logger.error(
        `Failed to send health check summary with visual: ${error.message}`,
      );
      throw error;
    }
  }

  async sendCriticalAlertWithVisual(
    chatId: string,
    alert: CriticalAlert,
    config: MonitoringConfig,
  ): Promise<string> {
    try {
      // Generate visual alert representation
      const visualAlert = this.visualStatus.generateCriticalAlertVisual({
        appInstanceName: alert.appInstanceName,
        environmentName: alert.environmentName,
        status: alert.status,
        details: alert.details,
        failedServices: alert.failedServices,
      });

      const now = new Date();
      const taggedUsers = this.messageTemplatesService.formatTaggedUsers(
        config.taggedUsers || [],
      );

      // Render message from template
      const message = await this.messageTemplatesService.renderTemplate(
        'critical_alert',
        {
          date: now.toISOString().split('T')[0],
          time: now.toTimeString().split(' ')[0],
          visual_alert: visualAlert,
          tagged_users: taggedUsers,
        },
      );

      return await this.sendMessage(chatId, message, config);
    } catch (error) {
      this.logger.error(
        `Failed to send critical alert with visual: ${error.message}`,
      );
      throw error;
    }
  }

  private getStatusIcon(status: string): string {
    switch (status) {
      case 'healthy':
        return '✅';
      case 'warning':
        return '⚠️';
      case 'critical':
        return '🔴';
      case 'error':
        return '❌';
      default:
        return '❓';
    }
  }
}
