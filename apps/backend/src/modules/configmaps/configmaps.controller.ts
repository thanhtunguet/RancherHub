import {
  Controller,
  Get,
  Query,
  Param,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { ConfigMapsService } from './configmaps.service';

@ApiTags('configmaps')
@Controller('api/configmaps')
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
}