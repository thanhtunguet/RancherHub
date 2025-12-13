import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { MessageTemplatesService } from './message-templates.service';
import { CreateMessageTemplateDto } from './dto/create-message-template.dto';
import { UpdateMessageTemplateDto } from './dto/update-message-template.dto';
import { PreviewTemplateDto } from './dto/preview-template.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Require2FAGuard } from '../auth/guards/require-2fa.guard';

@ApiTags('message-templates')
@Controller('api/message-templates')
@UseGuards(JwtAuthGuard, Require2FAGuard)
@ApiBearerAuth()
export class MessageTemplatesController {
  constructor(
    private readonly messageTemplatesService: MessageTemplatesService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all message templates' })
  @ApiResponse({
    status: 200,
    description: 'Message templates retrieved successfully',
  })
  async findAll() {
    return this.messageTemplatesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get message template by ID' })
  @ApiParam({ name: 'id', description: 'Template ID' })
  @ApiResponse({
    status: 200,
    description: 'Message template retrieved successfully',
  })
  async findOne(@Param('id') id: string) {
    return this.messageTemplatesService.findOne(id);
  }

  @Get('type/:type')
  @ApiOperation({ summary: 'Get message template by type' })
  @ApiParam({
    name: 'type',
    description: 'Template type',
    enum: ['test_connection', 'daily_health_check', 'critical_alert'],
  })
  @ApiResponse({
    status: 200,
    description: 'Message template retrieved successfully',
  })
  async findByType(@Param('type') type: string) {
    return this.messageTemplatesService.findByType(type);
  }

  @Post()
  @ApiOperation({ summary: 'Create new message template' })
  @ApiResponse({
    status: 201,
    description: 'Message template created successfully',
  })
  async create(@Body() dto: CreateMessageTemplateDto) {
    return this.messageTemplatesService.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update message template' })
  @ApiParam({ name: 'id', description: 'Template ID' })
  @ApiResponse({
    status: 200,
    description: 'Message template updated successfully',
  })
  async update(@Param('id') id: string, @Body() dto: UpdateMessageTemplateDto) {
    return this.messageTemplatesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete message template' })
  @ApiParam({ name: 'id', description: 'Template ID' })
  @ApiResponse({
    status: 204,
    description: 'Message template deleted successfully',
  })
  async delete(@Param('id') id: string) {
    await this.messageTemplatesService.delete(id);
  }

  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restore template to default' })
  @ApiParam({ name: 'id', description: 'Template ID' })
  @ApiResponse({
    status: 200,
    description: 'Template restored to default successfully',
  })
  async restoreDefault(@Param('id') id: string) {
    return this.messageTemplatesService.restoreDefault(id);
  }

  @Post('preview')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Preview template with sample data' })
  @ApiResponse({
    status: 200,
    description: 'Template preview generated successfully',
  })
  async preview(@Body() dto: PreviewTemplateDto) {
    const renderedMessage = this.messageTemplatesService.previewTemplate(dto);
    return {
      renderedMessage,
      sampleData: dto.sampleData,
    };
  }
}
