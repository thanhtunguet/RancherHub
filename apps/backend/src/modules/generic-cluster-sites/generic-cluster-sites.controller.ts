import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GenericClusterSitesService } from './generic-cluster-sites.service';
import { CreateGenericClusterSiteDto } from './dto/create-generic-cluster-site.dto';
import { UpdateGenericClusterSiteDto } from './dto/update-generic-cluster-site.dto';
import { TestConnectionResponseDto } from './dto/test-connection.dto';

@ApiTags('Generic Cluster Sites')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('generic-cluster-sites')
export class GenericClusterSitesController {
  constructor(
    private readonly genericClusterSitesService: GenericClusterSitesService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new generic cluster site' })
  @ApiResponse({
    status: 201,
    description: 'The cluster site has been successfully created.',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid kubeconfig or validation error.',
  })
  create(@Body() createGenericClusterSiteDto: CreateGenericClusterSiteDto) {
    return this.genericClusterSitesService.create(createGenericClusterSiteDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all generic cluster sites' })
  @ApiResponse({ status: 200, description: 'Return all cluster sites.' })
  findAll() {
    return this.genericClusterSitesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a generic cluster site by ID' })
  @ApiResponse({ status: 200, description: 'Return the cluster site.' })
  @ApiResponse({ status: 404, description: 'Cluster site not found.' })
  findOne(@Param('id') id: string) {
    return this.genericClusterSitesService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a generic cluster site' })
  @ApiResponse({
    status: 200,
    description: 'The cluster site has been successfully updated.',
  })
  @ApiResponse({ status: 404, description: 'Cluster site not found.' })
  @ApiResponse({
    status: 400,
    description: 'Invalid kubeconfig or validation error.',
  })
  update(
    @Param('id') id: string,
    @Body() updateGenericClusterSiteDto: UpdateGenericClusterSiteDto,
  ) {
    return this.genericClusterSitesService.update(
      id,
      updateGenericClusterSiteDto,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a generic cluster site' })
  @ApiResponse({
    status: 200,
    description: 'The cluster site has been successfully deleted.',
  })
  @ApiResponse({ status: 404, description: 'Cluster site not found.' })
  remove(@Param('id') id: string) {
    return this.genericClusterSitesService.remove(id);
  }

  @Post(':id/test')
  @ApiOperation({ summary: 'Test connection to a generic cluster site' })
  @ApiResponse({ status: 200, description: 'Connection test result.' })
  @ApiResponse({ status: 404, description: 'Cluster site not found.' })
  testConnection(@Param('id') id: string): Promise<TestConnectionResponseDto> {
    return this.genericClusterSitesService.testConnection(id);
  }

  @Post(':id/set-active')
  @ApiOperation({ summary: 'Set a cluster site as active/inactive' })
  @ApiResponse({
    status: 200,
    description: 'The cluster site active status has been updated.',
  })
  @ApiResponse({ status: 404, description: 'Cluster site not found.' })
  setActive(@Param('id') id: string, @Body('active') active: boolean) {
    return this.genericClusterSitesService.setActive(id, active);
  }

  @Get(':id/namespaces')
  @ApiOperation({ summary: 'Get namespaces from a generic cluster site' })
  @ApiResponse({
    status: 200,
    description: 'Return namespaces from the cluster.',
  })
  @ApiResponse({ status: 404, description: 'Cluster site not found.' })
  @ApiResponse({ status: 400, description: 'Failed to fetch namespaces.' })
  getNamespaces(@Param('id') id: string) {
    return this.genericClusterSitesService.getNamespaces(id);
  }
}
