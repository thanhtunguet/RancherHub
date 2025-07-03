import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { SitesService } from './sites.service';
import { CreateSiteDto } from './dto/create-site.dto';
import { UpdateSiteDto } from './dto/update-site.dto';
import { TestConnectionResponseDto } from './dto/test-connection.dto';

@ApiTags('sites')
@Controller('api/sites')
export class SitesController {
  constructor(private readonly sitesService: SitesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new Rancher site' })
  @ApiResponse({ status: 201, description: 'Site created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiBody({ type: CreateSiteDto })
  create(@Body() createSiteDto: CreateSiteDto) {
    return this.sitesService.create(createSiteDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all Rancher sites' })
  @ApiResponse({ status: 200, description: 'List of all sites' })
  findAll() {
    return this.sitesService.findAll();
  }

  @Get('active')
  @ApiOperation({ summary: 'Get the currently active site' })
  @ApiResponse({ status: 200, description: 'Active site details' })
  @ApiResponse({ status: 404, description: 'No active site found' })
  getActiveSite() {
    return this.sitesService.getActiveSite();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific site by ID' })
  @ApiResponse({ status: 200, description: 'Site details' })
  @ApiResponse({ status: 404, description: 'Site not found' })
  @ApiParam({ name: 'id', description: 'Site ID' })
  findOne(@Param('id') id: string) {
    return this.sitesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a site' })
  @ApiResponse({ status: 200, description: 'Site updated successfully' })
  @ApiResponse({ status: 404, description: 'Site not found' })
  @ApiParam({ name: 'id', description: 'Site ID' })
  @ApiBody({ type: UpdateSiteDto })
  update(@Param('id') id: string, @Body() updateSiteDto: UpdateSiteDto) {
    return this.sitesService.update(id, updateSiteDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a site' })
  @ApiResponse({ status: 204, description: 'Site deleted successfully' })
  @ApiResponse({ status: 404, description: 'Site not found' })
  @ApiParam({ name: 'id', description: 'Site ID' })
  remove(@Param('id') id: string) {
    return this.sitesService.remove(id);
  }

  @Post(':id/test')
  @ApiOperation({ summary: 'Test connection to a Rancher site' })
  @ApiResponse({
    status: 200,
    description: 'Connection test result',
    type: TestConnectionResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Site not found' })
  @ApiParam({ name: 'id', description: 'Site ID' })
  testConnection(@Param('id') id: string) {
    return this.sitesService.testConnection(id);
  }

  @Post(':id/activate')
  @ApiOperation({ summary: 'Set a site as active' })
  @ApiResponse({ status: 200, description: 'Site activated successfully' })
  @ApiResponse({ status: 404, description: 'Site not found' })
  @ApiParam({ name: 'id', description: 'Site ID' })
  activateSite(@Param('id') id: string) {
    return this.sitesService.setActive(id, true);
  }

  @Post(':id/deactivate')
  @ApiOperation({ summary: 'Deactivate a site' })
  @ApiResponse({ status: 200, description: 'Site deactivated successfully' })
  @ApiResponse({ status: 404, description: 'Site not found' })
  @ApiParam({ name: 'id', description: 'Site ID' })
  deactivateSite(@Param('id') id: string) {
    return this.sitesService.setActive(id, false);
  }

  @Get(':id/clusters')
  @ApiOperation({ summary: 'Get clusters from a Rancher site' })
  @ApiResponse({ status: 200, description: 'List of clusters' })
  @ApiResponse({ status: 404, description: 'Site not found' })
  @ApiParam({ name: 'id', description: 'Site ID' })
  getClusters(@Param('id') id: string) {
    return this.sitesService.getClusters(id);
  }

  @Get(':id/namespaces')
  @ApiOperation({ summary: 'Get namespaces from a Rancher site' })
  @ApiResponse({ status: 200, description: 'List of namespaces' })
  @ApiResponse({ status: 404, description: 'Site not found' })
  @ApiParam({ name: 'id', description: 'Site ID' })
  @ApiQuery({ name: 'clusterId', required: false, description: 'Filter by cluster ID' })
  getNamespaces(@Param('id') id: string, @Query('clusterId') clusterId?: string) {
    return this.sitesService.getNamespaces(id, clusterId);
  }
}