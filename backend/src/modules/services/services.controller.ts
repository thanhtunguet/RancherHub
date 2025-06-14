import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  Param,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { ServicesService } from './services.service';
import { SyncServicesDto } from './dto/sync-services.dto';
import { RancherApiService } from '../../services/rancher-api.service';
import { RancherSite } from '../../entities/rancher-site.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@ApiTags('services')
@Controller('api/services')
export class ServicesController {
  private readonly logger = new Logger(ServicesController.name);

  constructor(
    private readonly servicesService: ServicesService,
    private readonly rancherApiService: RancherApiService,
    @InjectRepository(RancherSite)
    private readonly rancherSiteRepository: Repository<RancherSite>,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Get services by environment with optional filtering',
  })
  @ApiResponse({
    status: 200,
    description: 'List of services in the environment',
  })
  @ApiResponse({ status: 400, description: 'Invalid environment ID' })
  @ApiQuery({
    name: 'env',
    required: true,
    description: 'Environment ID to fetch services for',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    description: 'Filter by workload type (deployment, daemonset, statefulset)',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search by service name',
  })
  async getServicesByEnvironment(
    @Query('env') environmentId: string,
    @Query('type') workloadType?: string,
    @Query('search') searchTerm?: string,
  ) {
    this.logger.debug(`getServicesByEnvironment called with:`, {
      environmentId,
      workloadType,
      searchTerm,
    });

    const services =
      await this.servicesService.getServicesByEnvironment(environmentId);

    this.logger.debug(
      `Retrieved ${services.length} services for environment ${environmentId}`,
    );

    let filteredServices = services;

    // Filter by workload type
    if (workloadType) {
      filteredServices = filteredServices.filter(
        (service) =>
          service.workloadType?.toLowerCase() === workloadType.toLowerCase(),
      );
      this.logger.debug(
        `After workload type filter: ${filteredServices.length} services`,
      );
    }

    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filteredServices = filteredServices.filter(
        (service) =>
          service.name.toLowerCase().includes(searchLower) ||
          service.imageTag?.toLowerCase().includes(searchLower),
      );
      this.logger.debug(
        `After search filter: ${filteredServices.length} services`,
      );
    }

    this.logger.debug(`Returning ${filteredServices.length} filtered services`);
    return filteredServices;
  }

  @Get('workload-types')
  @ApiOperation({ summary: 'Get available workload types for an environment' })
  @ApiResponse({
    status: 200,
    description: 'List of available workload types',
    schema: {
      type: 'object',
      properties: {
        types: {
          type: 'array',
          items: { type: 'string' },
          example: ['deployment', 'daemonset', 'statefulset'],
        },
      },
    },
  })
  @ApiQuery({
    name: 'env',
    required: true,
    description: 'Environment ID to get workload types for',
  })
  async getWorkloadTypes(@Query('env') environmentId: string) {
    this.logger.debug(
      `getWorkloadTypes called for environment: ${environmentId}`,
    );

    const services =
      await this.servicesService.getServicesByEnvironment(environmentId);
    const types = [
      ...new Set(
        services.map((service) => service.workloadType).filter(Boolean),
      ),
    ];

    this.logger.debug(`Found workload types: ${types.join(', ')}`);
    return { types: types.sort() };
  }

  @Get('by-app-instance/:appInstanceId')
  @ApiOperation({
    summary: 'Get services by app instance with optional filtering',
  })
  @ApiResponse({
    status: 200,
    description: 'List of services in the app instance',
  })
  @ApiResponse({ status: 404, description: 'App instance not found' })
  @ApiParam({ name: 'appInstanceId', description: 'App instance ID' })
  @ApiQuery({
    name: 'type',
    required: false,
    description: 'Filter by workload type (deployment, daemonset, statefulset)',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search by service name',
  })
  async getServicesByAppInstance(
    @Param('appInstanceId') appInstanceId: string,
    @Query('type') workloadType?: string,
    @Query('search') searchTerm?: string,
  ) {
    this.logger.debug(`getServicesByAppInstance called with:`, {
      appInstanceId,
      workloadType,
      searchTerm,
    });

    const services =
      await this.servicesService.getServicesByAppInstance(appInstanceId);

    this.logger.debug(
      `Retrieved ${services.length} services for app instance ${appInstanceId}`,
    );

    let filteredServices = services;

    // Filter by workload type
    if (workloadType) {
      filteredServices = filteredServices.filter(
        (service) =>
          service.workloadType?.toLowerCase() === workloadType.toLowerCase(),
      );
      this.logger.debug(
        `After workload type filter: ${filteredServices.length} services`,
      );
    }

    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filteredServices = filteredServices.filter(
        (service) =>
          service.name.toLowerCase().includes(searchLower) ||
          service.imageTag?.toLowerCase().includes(searchLower),
      );
      this.logger.debug(
        `After search filter: ${filteredServices.length} services`,
      );
    }

    this.logger.debug(`Returning ${filteredServices.length} filtered services`);
    return filteredServices;
  }

  @Get('test-api/:siteId')
  @ApiOperation({ summary: 'Test Rancher API endpoints' })
  @ApiResponse({
    status: 200,
    description: 'API test results',
  })
  @ApiParam({ name: 'siteId', description: 'Rancher site ID' })
  async testApiEndpoints(@Param('siteId') siteId: string) {
    const site = await this.rancherSiteRepository.findOne({
      where: { id: siteId },
    });

    if (!site) {
      throw new Error('Rancher site not found');
    }

    return this.rancherApiService.testApiEndpoints(site);
  }

  @Get('test-structure/:siteId')
  @ApiOperation({ summary: 'Test Rancher API structure' })
  @ApiResponse({
    status: 200,
    description: 'API structure test results',
  })
  @ApiParam({ name: 'siteId', description: 'Rancher site ID' })
  async testApiStructure(@Param('siteId') siteId: string) {
    const site = await this.rancherSiteRepository.findOne({
      where: { id: siteId },
    });

    if (!site) {
      throw new Error('Rancher site not found');
    }

    return this.rancherApiService.testApiStructure(site);
  }

  @Post('sync')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Synchronize services between environments' })
  @ApiResponse({
    status: 200,
    description: 'Services synchronized successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid sync request' })
  @ApiBody({ type: SyncServicesDto })
  async syncServices(@Body() syncDto: SyncServicesDto) {
    return this.servicesService.syncServices(syncDto);
  }

  @Get('sync/history')
  @ApiOperation({ summary: 'Get sync history' })
  @ApiResponse({
    status: 200,
    description: 'Sync history retrieved successfully',
  })
  @ApiQuery({
    name: 'env',
    required: false,
    description: 'Filter by environment ID',
  })
  async getSyncHistory(@Query('env') environmentId?: string) {
    return this.servicesService.getSyncHistory(environmentId);
  }

  @Get('sync/history/detailed')
  @ApiOperation({ summary: 'Get detailed sync history' })
  @ApiResponse({
    status: 200,
    description: 'Detailed sync history retrieved successfully',
  })
  @ApiQuery({
    name: 'env',
    required: false,
    description: 'Filter by environment ID',
  })
  async getDetailedSyncHistory(@Query('env') environmentId?: string) {
    return this.servicesService.getDetailedSyncHistory(environmentId);
  }

  @Get('compare')
  @ApiOperation({ summary: 'Compare services between two environments' })
  @ApiResponse({
    status: 200,
    description: 'Service comparison results',
    schema: {
      type: 'object',
      properties: {
        sourceEnvironmentId: { type: 'string' },
        targetEnvironmentId: { type: 'string' },
        summary: {
          type: 'object',
          properties: {
            totalServices: { type: 'number' },
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
              serviceName: { type: 'string' },
              workloadType: { type: 'string' },
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
    description: 'Source environment ID',
  })
  @ApiQuery({
    name: 'target',
    required: true,
    description: 'Target environment ID',
  })
  async compareServices(
    @Query('source') sourceEnvironmentId: string,
    @Query('target') targetEnvironmentId: string,
  ) {
    this.logger.debug(`compareServices called with:`, {
      sourceEnvironmentId,
      targetEnvironmentId,
    });

    return this.servicesService.compareServices(sourceEnvironmentId, targetEnvironmentId);
  }

  @Get('debug/app-instances/:environmentId')
  @ApiOperation({ summary: 'Debug app instances for an environment' })
  @ApiResponse({
    status: 200,
    description: 'Debug information for app instances',
  })
  @ApiParam({ name: 'environmentId', description: 'Environment ID' })
  async debugAppInstances(@Param('environmentId') environmentId: string) {
    this.logger.debug(
      `debugAppInstances called for environment: ${environmentId}`,
    );

    // Get all app instances for this environment
    const appInstances = await this.servicesService[
      'appInstanceRepository'
    ].find({
      where: { environmentId },
      relations: ['rancherSite', 'environment'],
    });

    this.logger.debug(
      `Found ${appInstances.length} app instances for environment ${environmentId}`,
    );

    return {
      environmentId,
      appInstancesCount: appInstances.length,
      appInstances: appInstances.map((ai) => ({
        id: ai.id,
        name: ai.name,
        cluster: ai.cluster,
        namespace: ai.namespace,
        rancherSiteId: ai.rancherSiteId,
        environmentId: ai.environmentId,
        createdAt: ai.createdAt,
        updatedAt: ai.updatedAt,
      })),
    };
  }

  @Get('debug/clusters/:siteId')
  @ApiOperation({ summary: 'Debug clusters for a site' })
  @ApiResponse({
    status: 200,
    description: 'Debug information for clusters',
  })
  @ApiParam({ name: 'siteId', description: 'Site ID' })
  async debugClusters(@Param('siteId') siteId: string) {
    this.logger.debug(`debugClusters called for site: ${siteId}`);

    const site = await this.rancherSiteRepository.findOne({
      where: { id: siteId },
    });

    if (!site) {
      throw new Error('Rancher site not found');
    }

    try {
      const clusters = await this.rancherApiService.getClusters(site);
      this.logger.debug(`Found ${clusters.length} clusters for site ${siteId}`);

      return {
        siteId,
        siteName: site.name,
        clustersCount: clusters.length,
        clusters: clusters.map((cluster) => ({
          id: cluster.id,
          name: cluster.name,
          state: cluster.state,
        })),
      };
    } catch (error) {
      this.logger.error(`Error fetching clusters for site ${siteId}:`, error);
      return {
        siteId,
        siteName: site.name,
        error: error.message,
      };
    }
  }
}
