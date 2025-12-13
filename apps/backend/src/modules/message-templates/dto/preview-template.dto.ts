import { IsString, IsNotEmpty, IsOptional, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PreviewTemplateDto {
  @ApiProperty({
    description: 'Template type for getting sample data',
    example: 'daily_health_check',
  })
  @IsString()
  @IsNotEmpty()
  templateType: string;

  @ApiProperty({
    description: 'Message template to preview',
    example:
      '🔍 **Daily Health Check** - {{date}} {{time}}\n\n{{visual_summary}}',
  })
  @IsString()
  @IsNotEmpty()
  messageTemplate: string;

  @ApiProperty({
    description: 'Optional custom sample data for preview',
    example: { date: '2025-01-29', time: '23:00:00' },
    required: false,
  })
  @IsObject()
  @IsOptional()
  sampleData?: Record<string, any>;
}
