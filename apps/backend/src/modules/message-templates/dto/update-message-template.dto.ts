import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateMessageTemplateDto {
  @ApiProperty({
    description: 'Display name for the template',
    example: 'Daily Health Check Report',
    required: false,
  })
  @IsString()
  @IsOptional()
  templateName?: string;

  @ApiProperty({
    description: 'Message template with placeholders',
    example:
      '🔍 **Daily Health Check** - {{date}} {{time}}\n\n{{visual_summary}}',
    required: false,
  })
  @IsString()
  @IsOptional()
  messageTemplate?: string;

  @ApiProperty({
    description: 'Description of what this template is used for',
    example: 'Sent daily at 11PM with system health summary',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Whether this template is active',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
