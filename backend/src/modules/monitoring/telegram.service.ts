import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosRequestConfig } from 'axios';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { MonitoringConfig } from '../../entities/monitoring-config.entity';

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);

  async sendMessage(
    chatId: string,
    message: string,
    config: MonitoringConfig,
  ): Promise<string> {
    const axiosConfig = this.createAxiosConfig(config);

    try {
      const response = await axios.post(
        `https://api.telegram.org/bot${config.telegramBotToken}/sendMessage`,
        {
          chat_id: chatId,
          text: message,
          parse_mode: 'Markdown',
        },
        axiosConfig,
      );

      this.logger.log(`Message sent to Telegram chat ${chatId}`);
      return response.data.result.message_id.toString();
    } catch (error) {
      this.logger.error(`Failed to send Telegram message: ${error.message}`);
      throw new Error(`Telegram API error: ${error.message}`);
    }
  }

  async testConnection(config: {
    telegramBotToken: string;
    telegramChatId: string;
    proxyHost?: string;
    proxyPort?: number;
    proxyUsername?: string;
    proxyPassword?: string;
  }): Promise<boolean> {
    const axiosConfig = this.createAxiosConfigFromDto(config);

    try {
      const testMessage = `🔍 **Telegram Connection Test** - ${new Date().toISOString()}\n\nThis is a test message from RancherHub monitoring system.`;

      const response = await axios.post(
        `https://api.telegram.org/bot${config.telegramBotToken}/sendMessage`,
        {
          chat_id: config.telegramChatId,
          text: testMessage,
          parse_mode: 'Markdown',
        },
        axiosConfig,
      );

      this.logger.log(`Test message sent successfully to chat ${config.telegramChatId}`);
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

  formatHealthCheckSummary(results: any[]): string {
    const now = new Date();
    const totalInstances = results.length;
    const healthyInstances = results.filter(r => r.status === 'healthy').length;
    
    let message = `🔍 **Daily Health Check Report** - ${now.toISOString().split('T')[0]} ${now.toTimeString().split(' ')[0]}\n\n`;
    message += `📊 **Overall Status**: ${healthyInstances === totalInstances ? '✅' : '⚠️'} `;
    message += `${healthyInstances === totalInstances ? 'All Systems Healthy' : 'Issues Detected'} (${healthyInstances}/${totalInstances} instances)\n\n`;

    // Group by environment
    const byEnvironment = results.reduce((acc, result) => {
      const envName = result.appInstance?.environment?.name || 'Unknown';
      if (!acc[envName]) acc[envName] = [];
      acc[envName].push(result);
      return acc;
    }, {});

    Object.entries(byEnvironment).forEach(([envName, instances]: [string, any[]]) => {
      message += `**Environment: ${envName}**\n`;
      instances.forEach(instance => {
        const statusIcon = this.getStatusIcon(instance.status);
        const servicesInfo = instance.servicesCount ? 
          ` (${instance.healthyServices || 0}/${instance.servicesCount} services)` : '';
        message += `• ${instance.appInstance?.name || 'Unknown'}: ${statusIcon} ${instance.status}${servicesInfo}\n`;
      });
      message += '\n';
    });

    // Performance summary
    const avgResponseTime = results.reduce((sum, r) => sum + (r.responseTimeMs || 0), 0) / results.length;
    message += `📈 **Performance**: Avg response time ${(avgResponseTime / 1000).toFixed(1)}s\n`;
    message += `⏰ Next check: Tomorrow 06:00`;

    return message;
  }

  formatCriticalAlert(alert: {
    appInstanceName: string;
    environmentName: string;
    serviceName?: string;
    status: string;
    details?: string;
  }): string {
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
    
    message += `🔧 **Recommended Actions:**\n`;
    message += `1. Check service logs\n`;
    message += `2. Verify resource limits\n`;
    message += `3. Restart service if needed\n\n`;
    message += `📞 Contact DevOps team immediately`;

    return message;
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