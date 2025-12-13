import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateMessageTemplateDto {
  @ApiProperty({
    description: 'Template type',
    enum: ['test_connection', 'daily_health_check', 'critical_alert'],
    example: 'daily_health_check',
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['test_connection', 'daily_health_check', 'critical_alert'])
  templateType: string;

  @ApiProperty({
    description: 'Display name for the template',
    example: 'Daily Health Check Report',
  })
  @IsString()
  @IsNotEmpty()
  templateName: string;

  @ApiProperty({
    description:
      'Message template with placeholders (e.g., {{date}}, {{time}})',
    example:
      '🔍 **Daily Health Check** - {{date}} {{time}}\n\n{{visual_summary}}\n\n{{tagged_users}}',
  })
  @IsString()
  @IsNotEmpty()
  messageTemplate: string;

  @ApiProperty({
    description: 'Description of what this template is used for',
    example: 'Sent daily at 11PM with system health summary',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;
}
