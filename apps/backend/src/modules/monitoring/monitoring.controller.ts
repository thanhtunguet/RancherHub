import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { MonitoringService } from './monitoring.service';
import { MonitoringCronService } from './cron.service';
import { CreateMonitoringConfigDto } from './dto/create-monitoring-config.dto';
import { UpdateMonitoringConfigDto } from './dto/update-monitoring-config.dto';
import { CreateMonitoredInstanceDto } from './dto/create-monitored-instance.dto';
import { UpdateMonitoredInstanceDto } from './dto/update-monitored-instance.dto';
import { TestTelegramConnectionDto } from './dto/test-telegram-connection.dto';

@ApiTags('monitoring')
@Controller('api/monitoring')
export class MonitoringController {
  constructor(
    private readonly monitoringService: MonitoringService,
    private readonly monitoringCronService: MonitoringCronService,
  ) {}

  @Get('test')
  test() {
    return { status: 'ok', message: 'Monitoring controller works' };
  }

  // Monitoring Configuration Endpoints
  @Get('config')
  @ApiOperation({ summary: 'Get monitoring configuration' })
  @ApiResponse({ status: 200, description: 'Monitoring configuration retrieved successfully' })
  async getConfig() {
    try {
      return await this.monitoringService.getConfig();
    } catch (error) {
      console.error('Controller error:', error);
      return null;
    }
  }

  @Post('config')
  @ApiOperation({ summary: 'Create or update monitoring configuration' })
  @ApiResponse({ status: 201, description: 'Monitoring configuration created/updated successfully' })
  async createOrUpdateConfig(@Body() dto: CreateMonitoringConfigDto) {
    return this.monitoringService.createOrUpdateConfig(dto);
  }

  @Put('config')
  @ApiOperation({ summary: 'Update monitoring configuration' })
  @ApiResponse({ status: 200, description: 'Monitoring configuration updated successfully' })
  async updateConfig(@Body() dto: UpdateMonitoringConfigDto) {
    return this.monitoringService.updateConfig(dto);
  }

  @Post('config/test-telegram')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Test Telegram connection' })
  @ApiResponse({ status: 200, description: 'Telegram connection test completed' })
  async testTelegramConnection(@Body() dto: TestTelegramConnectionDto) {
    return this.monitoringService.testTelegramConnection(dto);
  }

  // Monitored Instances Endpoints
  @Get('instances')
  @ApiOperation({ summary: 'Get all monitored instances' })
  @ApiResponse({ status: 200, description: 'Monitored instances retrieved successfully' })
  async getMonitoredInstances() {
    return this.monitoringService.getMonitoredInstances();
  }

  @Get('instances/:id')
  @ApiOperation({ summary: 'Get monitored instance by ID' })
  @ApiParam({ name: 'id', description: 'Monitored instance ID' })
  @ApiResponse({ status: 200, description: 'Monitored instance retrieved successfully' })
  async getMonitoredInstance(@Param('id') id: string) {
    return this.monitoringService.getMonitoredInstance(id);
  }

  @Post('instances')
  @ApiOperation({ summary: 'Add instance to monitoring' })
  @ApiResponse({ status: 201, description: 'Instance added to monitoring successfully' })
  async createMonitoredInstance(@Body() dto: CreateMonitoredInstanceDto) {
    return this.monitoringService.createMonitoredInstance(dto);
  }

  @Put('instances/:id')
  @ApiOperation({ summary: 'Update monitored instance' })
  @ApiParam({ name: 'id', description: 'Monitored instance ID' })
  @ApiResponse({ status: 200, description: 'Monitored instance updated successfully' })
  async updateMonitoredInstance(
    @Param('id') id: string,
    @Body() dto: UpdateMonitoredInstanceDto,
  ) {
    return this.monitoringService.updateMonitoredInstance(id, dto);
  }

  @Delete('instances/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove instance from monitoring' })
  @ApiParam({ name: 'id', description: 'Monitored instance ID' })
  @ApiResponse({ status: 204, description: 'Instance removed from monitoring successfully' })
  async deleteMonitoredInstance(@Param('id') id: string) {
    await this.monitoringService.deleteMonitoredInstance(id);
  }

  // Monitoring History Endpoints
  @Get('history')
  @ApiOperation({ summary: 'Get monitoring history' })
  @ApiQuery({ name: 'instanceId', required: false, description: 'Filter by monitored instance ID' })
  @ApiQuery({ name: 'days', required: false, description: 'Number of days to retrieve (default: 7)' })
  @ApiResponse({ status: 200, description: 'Monitoring history retrieved successfully' })
  async getMonitoringHistory(
    @Query('instanceId') instanceId?: string,
    @Query('days') days?: number,
  ) {
    return this.monitoringService.getMonitoringHistory(instanceId, days || 7);
  }

  // Alert History Endpoints
  @Get('alerts')
  @ApiOperation({ summary: 'Get alert history' })
  @ApiQuery({ name: 'instanceId', required: false, description: 'Filter by monitored instance ID' })
  @ApiQuery({ name: 'resolved', required: false, description: 'Filter by resolution status' })
  @ApiResponse({ status: 200, description: 'Alert history retrieved successfully' })
  async getAlertHistory(
    @Query('instanceId') instanceId?: string,
    @Query('resolved') resolved?: boolean,
  ) {
    return this.monitoringService.getAlertHistory(instanceId, resolved);
  }

  @Put('alerts/:id/resolve')
  @ApiOperation({ summary: 'Resolve alert' })
  @ApiParam({ name: 'id', description: 'Alert ID' })
  @ApiResponse({ status: 200, description: 'Alert resolved successfully' })
  async resolveAlert(@Param('id') id: string) {
    return this.monitoringService.resolveAlert(id);
  }

  // Manual Trigger Endpoints
  @Post('trigger/daily-check')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Manually trigger daily health check' })
  @ApiResponse({ status: 200, description: 'Daily health check triggered successfully' })
  async triggerDailyCheck() {
    await this.monitoringCronService.triggerDailyCheck();
    return { message: 'Daily health check triggered successfully' };
  }

  @Post('trigger/hourly-check')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Manually trigger hourly health check' })
  @ApiResponse({ status: 200, description: 'Hourly health check triggered successfully' })
  async triggerHourlyCheck() {
    await this.monitoringCronService.triggerHourlyCheck();
    return { message: 'Hourly health check triggered successfully' };
  }
}