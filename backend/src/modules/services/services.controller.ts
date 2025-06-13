import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  Param,
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
  constructor(
    private readonly servicesService: ServicesService,
    private readonly rancherApiService: RancherApiService,
    @InjectRepository(RancherSite)
    private readonly rancherSiteRepository: Repository<RancherSite>,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get services by environment with optional filtering' })
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
    const services = await this.servicesService.getServicesByEnvironment(environmentId);
    
    let filteredServices = services;
    
    // Filter by workload type
    if (workloadType) {
      filteredServices = filteredServices.filter(service => 
        service.workloadType?.toLowerCase() === workloadType.toLowerCase()
      );
    }
    
    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filteredServices = filteredServices.filter(service =>
        service.name.toLowerCase().includes(searchLower) ||
        service.imageTag?.toLowerCase().includes(searchLower)
      );
    }
    
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
          example: ['deployment', 'daemonset', 'statefulset']
        }
      }
    }
  })
  @ApiQuery({
    name: 'env',
    required: true,
    description: 'Environment ID to get workload types for',
  })
  async getWorkloadTypes(@Query('env') environmentId: string) {
    const services = await this.servicesService.getServicesByEnvironment(environmentId);
    const types = [...new Set(services.map(service => service.workloadType).filter(Boolean))];
    return { types: types.sort() };
  }

  @Get('by-app-instance/:appInstanceId')
  @ApiOperation({ summary: 'Get services by app instance with optional filtering' })
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
    const services = await this.servicesService.getServicesByAppInstance(appInstanceId);
    
    let filteredServices = services;
    
    // Filter by workload type
    if (workloadType) {
      filteredServices = filteredServices.filter(service => 
        service.workloadType?.toLowerCase() === workloadType.toLowerCase()
      );
    }
    
    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filteredServices = filteredServices.filter(service =>
        service.name.toLowerCase().includes(searchLower) ||
        service.imageTag?.toLowerCase().includes(searchLower)
      );
    }
    
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

  @Get('debug/app-instances/:environmentId')
  @ApiOperation({ summary: 'Debug app instances for environment' })
  @ApiResponse({
    status: 200,
    description: 'App instances debug info',
  })
  @ApiParam({ name: 'environmentId', description: 'Environment ID' })
  async debugAppInstances(@Param('environmentId') environmentId: string) {
    const appInstances = await this.servicesService[
      'appInstanceRepository'
    ].find({
      where: { environmentId },
      relations: ['rancherSite'],
    });

    return {
      environmentId,
      appInstances: appInstances.map((instance) => ({
        id: instance.id,
        name: instance.name,
        cluster: instance.cluster,
        namespace: instance.namespace,
        rancherSiteId: instance.rancherSiteId,
        rancherSite: {
          id: instance.rancherSite.id,
          name: instance.rancherSite.name,
          url: instance.rancherSite.url,
          active: instance.rancherSite.active,
        },
      })),
    };
  }

  @Get('debug/clusters/:siteId')
  @ApiOperation({ summary: 'Debug clusters for site' })
  @ApiResponse({
    status: 200,
    description: 'Clusters debug info',
  })
  @ApiParam({ name: 'siteId', description: 'Rancher site ID' })
  async debugClusters(@Param('siteId') siteId: string) {
    const site = await this.rancherSiteRepository.findOne({
      where: { id: siteId },
    });

    if (!site) {
      throw new Error('Rancher site not found');
    }

    try {
      const clusters = await this.rancherApiService.getClusters(site);
      return {
        siteId,
        siteName: site.name,
        siteUrl: site.url,
        clusters: clusters.map((cluster) => ({
          id: cluster.id,
          name: cluster.name,
          state: cluster.state,
          description: cluster.description,
        })),
      };
    } catch (error) {
      return {
        siteId,
        siteName: site.name,
        siteUrl: site.url,
        error: error.message,
      };
    }
  }
}
