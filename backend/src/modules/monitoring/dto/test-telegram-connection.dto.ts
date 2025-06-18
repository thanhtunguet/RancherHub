import { IsString, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TestTelegramConnectionDto {
  @ApiProperty({
    description: 'Telegram bot token for testing',
    example: '1234567890:ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  })
  @IsString()
  telegramBotToken: string;

  @ApiProperty({
    description: 'Telegram chat ID for testing',
    example: '123456789',
  })
  @IsString()
  telegramChatId: string;

  @ApiPropertyOptional({
    description: 'SOCKS5 proxy host for testing',
    example: 'proxy.example.com',
  })
  @IsOptional()
  @IsString()
  proxyHost?: string;

  @ApiPropertyOptional({
    description: 'SOCKS5 proxy port for testing',
    example: 1080,
  })
  @IsOptional()
  @IsNumber()
  proxyPort?: number;

  @ApiPropertyOptional({
    description: 'Proxy username for testing',
    example: 'proxyuser',
  })
  @IsOptional()
  @IsString()
  proxyUsername?: string;

  @ApiPropertyOptional({
    description: 'Proxy password for testing',
    example: 'proxypass',
  })
  @IsOptional()
  @IsString()
  proxyPassword?: string;
}