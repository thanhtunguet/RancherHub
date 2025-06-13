import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { ServicesService } from './services.service';
import { SyncServicesDto } from './dto/sync-services.dto';

@ApiTags('services')
@Controller('api/services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Get()
  @ApiOperation({ summary: 'Get services by environment' })
  @ApiResponse({ status: 200, description: 'List of services in the environment' })
  @ApiResponse({ status: 400, description: 'Invalid environment ID' })
  @ApiQuery({
    name: 'env',
    required: true,
    description: 'Environment ID to fetch services for',
  })
  async getServicesByEnvironment(@Query('env') environmentId: string) {
    return this.servicesService.getServicesByEnvironment(environmentId);
  }

  @Post('sync')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Synchronize services between environments' })
  @ApiResponse({ 
    status: 200, 
    description: 'Synchronization completed',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Sync operation ID' },
        status: { type: 'string', description: 'Sync status' },
        startTime: { type: 'string', format: 'date-time' },
        endTime: { type: 'string', format: 'date-time' },
        results: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              serviceId: { type: 'string' },
              targetAppInstanceId: { type: 'string' },
              previousImageTag: { type: 'string' },
              newImageTag: { type: 'string' },
              status: { type: 'string' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid synchronization data' })
  @ApiResponse({ status: 404, description: 'Service or environment not found' })
  @ApiBody({ type: SyncServicesDto })
  async syncServices(@Body() syncDto: SyncServicesDto) {
    return this.servicesService.syncServices(syncDto);
  }

  @Get('sync/history')
  @ApiOperation({ summary: 'Get synchronization history' })
  @ApiResponse({ status: 200, description: 'List of sync operations' })
  @ApiQuery({
    name: 'env',
    required: false,
    description: 'Filter by environment ID',
  })
  async getSyncHistory(@Query('env') environmentId?: string) {
    return this.servicesService.getSyncHistory(environmentId);
  }
}