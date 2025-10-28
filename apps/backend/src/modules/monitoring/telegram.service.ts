import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosRequestConfig } from 'axios';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { MonitoringConfig } from '../../entities/monitoring-config.entity';
import { VisualStatusService } from './visual-status.service';
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
  constructor(private readonly visualStatus: VisualStatusService) {}

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
      this.logger.error(`Failed to send Telegram message: ${error.message}`);
      throw new Error(`Telegram API error: ${error.message}`);
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
    const FormData = require('form-data');
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
      this.logger.error(`Failed to send Telegram photo: ${error.message}`);
      throw new Error(`Telegram photo API error: ${error.message}`);
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
      this.logger.error(`Failed to send message with image, falling back to text: ${error.message}`);
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
      const testMessage = `🔍 **Telegram Connection Test** - ${new Date().toISOString()}\n\nThis is a test message from RancherHub monitoring system.`;

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
      console.log(error);
      this.logger.error(`Telegram connection test failed: ${error.message}`);
      throw new Error(`Telegram connection test failed: ${error.message}`);
    }
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

  formatHealthCheckSummary(results: HealthCheckResult[]): string {
    const now = new Date();
    const totalInstances = results.length;
    const healthyInstances = results.filter(
      (r) => r.status === 'healthy',
    ).length;

    let message = `Anh @thangld19 dậy check monitor nhé
    
    🔍 **Daily Health Check Report** - ${now.toISOString().split('T')[0]} ${now.toTimeString().split(' ')[0]}\n\n`;
    message += `📊 **Overall Status**: ${healthyInstances === totalInstances ? '✅' : '⚠️'} `;
    message += `${healthyInstances === totalInstances ? 'All Systems Healthy' : 'Issues Detected'} (${healthyInstances}/${totalInstances} instances)\n\n`;

    // Group by environment
    const byEnvironment = results.reduce<EnvironmentGroupedResults>(
      (acc, result) => {
        const envName = result.appInstance?.environment?.name || 'Unknown';
        if (!acc[envName]) acc[envName] = [];
        acc[envName].push(result);
        return acc;
      },
      {},
    );

    Object.entries(byEnvironment).forEach(
      ([envName, instances]: [string, HealthCheckResult[]]) => {
        message += `**Environment: ${envName}**\n`;
        instances.forEach((instance) => {
          const statusIcon = this.getStatusIcon(instance.status);
          const servicesInfo = instance.servicesCount
            ? ` (${instance.healthyServices || 0}/${instance.servicesCount} services)`
            : '';
          message += `• ${instance.appInstance?.name || 'Unknown'}: ${statusIcon} ${instance.status}${servicesInfo}\n`;

          // Add failed service details if there are any
          if (instance.failedServices > 0 && instance.details?.workloads) {
            const failedWorkloads = instance.details.workloads.filter(
              (w) => w.status === 'failed',
            );
            if (failedWorkloads.length > 0) {
              message += `  ❌ **Failed Services:**\n`;
              failedWorkloads
                .slice(0, 3)
                .forEach((workload: WorkloadDetails) => {
                  message += `    - ${workload.name} (${workload.type}): ${workload.state}${workload.scale ? ` [${workload.availableReplicas || 0}/${workload.scale}]` : ''}\n`;
                });
              if (failedWorkloads.length > 3) {
                message += `    - ... and ${failedWorkloads.length - 3} more\n`;
              }
            }
          }
        });
        message += '\n';
      },
    );

    // Performance summary
    const avgResponseTime =
      results.reduce((sum, r) => sum + (r.responseTimeMs || 0), 0) /
      results.length;
    message += `📈 **Performance**: Avg response time ${(avgResponseTime / 1000).toFixed(1)}s\n`;
    message += `⏰ Next check: Tomorrow 06:00`;

    return message;
  }

  async sendHealthCheckSummaryWithVisual(
    chatId: string,
    results: HealthCheckResult[],
    config: MonitoringConfig,
  ): Promise<string> {
    try {
      // Generate visual status representation
      const visualSummary = this.visualStatus.generateHealthCheckVisualSummary(results);

      const now = new Date();
      const totalInstances = results.length;
      const healthyInstances = results.filter(r => r.status === 'healthy').length;
      const warningInstances = results.filter(r => r.status === 'warning').length;
      const criticalInstances = results.filter(r => r.status === 'critical' || r.status === 'error').length;

      let message = `Anh @thangld19 đây check monitor nhé

`;
      message += `🔍 **Daily Health Check Report** - ${now.toISOString().split('T')[0]} ${now.toTimeString().split(' ')[0]}
`;
      message += visualSummary;

      const avgResponseTime = results.reduce((sum, r) => sum + (r.responseTimeMs || 0), 0) / results.length;
      message += `📈 **Performance**: Avg response time ${(avgResponseTime / 1000).toFixed(1)}s
`;
      message += `⏰ Next check: Tomorrow 06:00`;

      return await this.sendMessage(chatId, message, config);
    } catch (error) {
      this.logger.error(`Failed to send health check summary with visual: ${error.message}`);
      // Fallback to original text message
      const textMessage = this.formatHealthCheckSummary(results);
      return await this.sendMessage(chatId, textMessage, config);
    }
  }

  formatCriticalAlert(alert: CriticalAlert): string {
    const now = new Date();
    let message = `🚨 **CRITICAL ALERT** - ${now.toISOString().split('T')[0]} ${now.toTimeString().split(' ')[0]}\n\n`;

    message += `**Service Failure Detected**\n`;
    message += `• Environment: ${alert.environmentName}\n`;
    message += `• Instance: ${alert.appInstanceName}\n`;

    if (alert.serviceName) {
      message += `• Service: ${alert.serviceName}\n`;
    }

    message += `• Status: ❌ ${alert.status}\n\n`;

    if (alert.details) {
      message += `**Details:**\n${alert.details}\n\n`;
    }

    // Add failed service details if available
    if (alert.failedServices && alert.failedServices.length > 0) {
      message += `**Failed Services:**\n`;
      alert.failedServices.slice(0, 5).forEach((service: WorkloadDetails) => {
        message += `• ${service.name} (${service.type}): ${service.state}${service.scale ? ` [${service.availableReplicas || 0}/${service.scale}]` : ''}\n`;
      });
      if (alert.failedServices.length > 5) {
        message += `• ... and ${alert.failedServices.length - 5} more services\n`;
      }
      message += '\n';
    }

    message += `🔧 **Recommended Actions:**\n`;
    message += `1. Check service logs\n`;
    message += `2. Verify resource limits\n`;
    message += `3. Restart service if needed\n\n`;
    message += `📞 Contact DevOps team immediately`;

    return message;
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
      let message = `🚨 **CRITICAL ALERT** - ${now.toISOString().split('T')[0]} ${now.toTimeString().split(' ')[0]}
`;
      message += visualAlert;
      message += `📞 Contact DevOps team immediately`;

      return await this.sendMessage(chatId, message, config);
    } catch (error) {
      this.logger.error(`Failed to send critical alert with visual: ${error.message}`);
      // Fallback to text message
      const textMessage = this.formatCriticalAlert(alert);
      return await this.sendMessage(chatId, textMessage, config);
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
