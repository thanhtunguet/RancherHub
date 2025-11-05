import {
  Controller,
  Get,
  Query,
  Post,
  Body,
  Param,
  Logger,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ConfigMapsService } from './configmaps.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Require2FAGuard } from '../auth/guards/require-2fa.guard';

@ApiTags('configmaps')
@Controller('api/configmaps')
@UseGuards(JwtAuthGuard, Require2FAGuard)
@ApiBearerAuth()
export class ConfigMapsController {
  private readonly logger = new Logger(ConfigMapsController.name);

  constructor(private readonly configMapsService: ConfigMapsService) {}

  @Get('by-app-instance/:appInstanceId')
  @ApiOperation({
    summary: 'Get ConfigMaps by app instance',
  })
  @ApiResponse({
    status: 200,
    description: 'List of ConfigMaps in the app instance',
  })
  @ApiResponse({ status: 404, description: 'App instance not found' })
  async getConfigMapsByAppInstance(@Param('appInstanceId') appInstanceId: string) {
    this.logger.debug(`getConfigMapsByAppInstance called with: ${appInstanceId}`);
    return this.configMapsService.getConfigMapsByAppInstance(appInstanceId);
  }

  @Get('compare/by-instance')
  @ApiOperation({ summary: 'Compare ConfigMaps between two app instances' })
  @ApiResponse({
    status: 200,
    description: 'ConfigMap comparison results between app instances',
    schema: {
      type: 'object',
      properties: {
        sourceAppInstanceId: { type: 'string' },
        targetAppInstanceId: { type: 'string' },
        summary: {
          type: 'object',
          properties: {
            totalConfigMaps: { type: 'number' },
            identical: { type: 'number' },
            different: { type: 'number' },
            missingInSource: { type: 'number' },
            missingInTarget: { type: 'number' },
          },
        },
        comparisons: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              configMapName: { type: 'string' },
              source: { type: 'object', nullable: true },
              target: { type: 'object', nullable: true },
              differences: { type: 'object' },
              status: { type: 'string', enum: ['identical', 'different', 'missing'] },
            },
          },
        },
      },
    },
  })
  @ApiQuery({
    name: 'source',
    required: true,
    description: 'Source app instance ID',
  })
  @ApiQuery({
    name: 'target',
    required: true,
    description: 'Target app instance ID',
  })
  async compareConfigMapsByInstance(
    @Query('source') sourceAppInstanceId: string,
    @Query('target') targetAppInstanceId: string,
  ) {
    this.logger.debug(`compareConfigMapsByInstance called with:`, {
      sourceAppInstanceId,
      targetAppInstanceId,
    });

    return this.configMapsService.compareConfigMapsByInstance(sourceAppInstanceId, targetAppInstanceId);
  }

  @Get(':configMapName/details')
  @ApiOperation({ summary: 'Get detailed comparison of a specific ConfigMap between two app instances' })
  @ApiResponse({
    status: 200,
    description: 'Detailed ConfigMap comparison with key-by-key differences',
  })
  @ApiQuery({
    name: 'source',
    required: true,
    description: 'Source app instance ID',
  })
  @ApiQuery({
    name: 'target',
    required: true,
    description: 'Target app instance ID',
  })
  async getConfigMapDetails(
    @Param('configMapName') configMapName: string,
    @Query('source') sourceAppInstanceId: string,
    @Query('target') targetAppInstanceId: string,
  ) {
    this.logger.debug(`getConfigMapDetails called with:`, {
      configMapName,
      sourceAppInstanceId,
      targetAppInstanceId,
    });

    return this.configMapsService.getConfigMapDetails(configMapName, sourceAppInstanceId, targetAppInstanceId);
  }

  @Post('sync-key')
  @ApiOperation({ summary: 'Sync a single key from source ConfigMap to target ConfigMap' })
  @ApiResponse({
    status: 200,
    description: 'Key synced successfully',
  })
  async syncConfigMapKey(@Body() syncData: {
    sourceAppInstanceId: string;
    targetAppInstanceId: string;
    configMapName: string;
    key: string;
    value: string;
  }, @Request() req) {
    this.logger.debug(`syncConfigMapKey called with:`, syncData);
    const initiatedBy = req.user?.username || req.user?.userId || 'system';
    return this.configMapsService.syncConfigMapKey(syncData, initiatedBy);
  }

  @Post('sync-keys')
  @ApiOperation({ summary: 'Sync multiple keys from source ConfigMap to target ConfigMap' })
  @ApiResponse({
    status: 200,
    description: 'Keys synced successfully',
  })
  async syncConfigMapKeys(@Body() syncData: {
    sourceAppInstanceId: string;
    targetAppInstanceId: string;
    configMapName: string;
    keys: Record<string, string>;
  }, @Request() req) {
    this.logger.debug(`syncConfigMapKeys called with:`, syncData);
    const initiatedBy = req.user?.username || req.user?.userId || 'system';
    return this.configMapsService.syncConfigMapKeys(syncData, initiatedBy);
  }
}