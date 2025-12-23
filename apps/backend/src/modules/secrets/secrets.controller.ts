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
import { SecretsService } from './secrets.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Require2FAGuard } from '../auth/guards/require-2fa.guard';

@ApiTags('secrets')
@Controller('api/secrets')
@UseGuards(JwtAuthGuard, Require2FAGuard)
@ApiBearerAuth()
export class SecretsController {
  private readonly logger = new Logger(SecretsController.name);

  constructor(private readonly secretsService: SecretsService) {}

  @Get('by-app-instance/:appInstanceId')
  @ApiOperation({
    summary: 'Get Secrets by app instance',
  })
  @ApiResponse({
    status: 200,
    description: 'List of Secrets in the app instance',
  })
  @ApiResponse({ status: 404, description: 'App instance not found' })
  async getSecretsByAppInstance(
    @Param('appInstanceId') appInstanceId: string,
  ) {
    this.logger.debug(
      `getSecretsByAppInstance called with: ${appInstanceId}`,
    );
    return this.secretsService.getSecretsByAppInstance(appInstanceId);
  }

  @Get('compare/by-instance')
  @ApiOperation({ summary: 'Compare Secrets between two app instances' })
  @ApiResponse({
    status: 200,
    description: 'Secret comparison results between app instances',
    schema: {
      type: 'object',
      properties: {
        sourceAppInstanceId: { type: 'string' },
        targetAppInstanceId: { type: 'string' },
        summary: {
          type: 'object',
          properties: {
            totalSecrets: { type: 'number' },
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
              secretName: { type: 'string' },
              source: { type: 'object', nullable: true },
              target: { type: 'object', nullable: true },
              differences: { type: 'object' },
              status: {
                type: 'string',
                enum: ['identical', 'different', 'missing'],
              },
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
  async compareSecretsByInstance(
    @Query('source') sourceAppInstanceId: string,
    @Query('target') targetAppInstanceId: string,
  ) {
    this.logger.debug(`compareSecretsByInstance called with:`, {
      sourceAppInstanceId,
      targetAppInstanceId,
    });

    return this.secretsService.compareSecretsByInstance(
      sourceAppInstanceId,
      targetAppInstanceId,
    );
  }

  @Get(':secretName/details')
  @ApiOperation({
    summary:
      'Get detailed comparison of a specific Secret between two app instances',
  })
  @ApiResponse({
    status: 200,
    description: 'Detailed Secret comparison with key-by-key differences',
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
  async getSecretDetails(
    @Param('secretName') secretName: string,
    @Query('source') sourceAppInstanceId: string,
    @Query('target') targetAppInstanceId: string,
  ) {
    this.logger.debug(`getSecretDetails called with:`, {
      secretName,
      sourceAppInstanceId,
      targetAppInstanceId,
    });

    return this.secretsService.getSecretDetails(
      secretName,
      sourceAppInstanceId,
      targetAppInstanceId,
    );
  }

  @Post('sync-key')
  @ApiOperation({
    summary: 'Sync a single key from source Secret to target Secret',
  })
  @ApiResponse({
    status: 200,
    description: 'Key synced successfully',
  })
  async syncSecretKey(
    @Body()
    syncData: {
      sourceAppInstanceId: string;
      targetAppInstanceId: string;
      secretName: string;
      key: string;
      value: string;
    },
    @Request() req,
  ) {
    this.logger.debug(`syncSecretKey called with:`, syncData);
    const initiatedBy = req.user?.username || req.user?.userId || 'system';
    return this.secretsService.syncSecretKey(syncData, initiatedBy);
  }

  @Post('sync-keys')
  @ApiOperation({
    summary: 'Sync multiple keys from source Secret to target Secret',
  })
  @ApiResponse({
    status: 200,
    description: 'Keys synced successfully',
  })
  async syncSecretKeys(
    @Body()
    syncData: {
      sourceAppInstanceId: string;
      targetAppInstanceId: string;
      secretName: string;
      keys: Record<string, string>;
    },
    @Request() req,
  ) {
    this.logger.debug(`syncSecretKeys called with:`, syncData);
    const initiatedBy = req.user?.username || req.user?.userId || 'system';
    return this.secretsService.syncSecretKeys(syncData, initiatedBy);
  }
}