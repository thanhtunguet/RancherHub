import { IsString, IsNumber, IsBoolean, IsOptional, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMonitoringConfigDto {
  @ApiPropertyOptional({
    description: 'Telegram bot token for notifications',
    example: '1234567890:ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  })
  @IsOptional()
  @IsString()
  telegramBotToken?: string;

  @ApiPropertyOptional({
    description: 'Telegram chat ID to send notifications to',
    example: '123456789',
  })
  @IsOptional()
  @IsString()
  telegramChatId?: string;

  @ApiPropertyOptional({
    description: 'SOCKS5 proxy host for Telegram API access',
    example: 'proxy.example.com',
  })
  @IsOptional()
  @IsString()
  proxyHost?: string;

  @ApiPropertyOptional({
    description: 'SOCKS5 proxy port',
    example: 1080,
  })
  @IsOptional()
  @IsNumber()
  proxyPort?: number;

  @ApiPropertyOptional({
    description: 'Proxy username for authentication',
    example: 'proxyuser',
  })
  @IsOptional()
  @IsString()
  proxyUsername?: string;

  @ApiPropertyOptional({
    description: 'Proxy password for authentication',
    example: 'proxypass',
  })
  @IsOptional()
  @IsString()
  proxyPassword?: string;

  @ApiProperty({
    description: 'Enable or disable monitoring',
    example: true,
    default: true,
  })
  @IsBoolean()
  monitoringEnabled: boolean = true;

  @ApiProperty({
    description: 'Number of consecutive failures before triggering alert',
    example: 3,
    default: 3,
  })
  @IsNumber()
  alertThreshold: number = 3;

  @ApiProperty({
    description: 'Notification schedule frequency',
    example: 'daily',
    enum: ['immediate', 'hourly', 'daily'],
    default: 'daily',
  })
  @IsIn(['immediate', 'hourly', 'daily'])
  notificationSchedule: string = 'daily';
}