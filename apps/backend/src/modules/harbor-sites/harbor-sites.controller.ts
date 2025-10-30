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
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { HarborSitesService } from './harbor-sites.service';
import { CreateHarborSiteDto } from './dto/create-harbor-site.dto';
import { UpdateHarborSiteDto } from './dto/update-harbor-site.dto';
import { TestHarborConnectionDto } from './dto/test-harbor-connection.dto';
import { HarborApiService } from '../../services/harbor-api.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Require2FAGuard } from '../auth/guards/require-2fa.guard';

@ApiTags('harbor-sites')
@Controller('api/harbor-sites')
@UseGuards(JwtAuthGuard, Require2FAGuard)
@ApiBearerAuth()
export class HarborSitesController {
  constructor(
    private readonly harborSitesService: HarborSitesService,
    private readonly harborApiService: HarborApiService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new Harbor site' })
  @ApiResponse({ status: 201, description: 'Harbor site created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiBody({ type: CreateHarborSiteDto })
  create(@Body() createHarborSiteDto: CreateHarborSiteDto) {
    return this.harborSitesService.create(createHarborSiteDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all Harbor sites' })
  @ApiResponse({ status: 200, description: 'List of all Harbor sites' })
  findAll() {
    return this.harborSitesService.findAll();
  }

  @Get('active')
  @ApiOperation({ summary: 'Get the currently active Harbor site' })
  @ApiResponse({ status: 200, description: 'Active Harbor site details' })
  @ApiResponse({ status: 404, description: 'No active Harbor site found' })
  getActiveSite() {
    return this.harborSitesService.getActiveSite();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific Harbor site by ID' })
  @ApiResponse({ status: 200, description: 'Harbor site details' })
  @ApiResponse({ status: 404, description: 'Harbor site not found' })
  @ApiParam({ name: 'id', description: 'Harbor site ID' })
  findOne(@Param('id') id: string) {
    return this.harborSitesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a Harbor site' })
  @ApiResponse({ status: 200, description: 'Harbor site updated successfully' })
  @ApiResponse({ status: 404, description: 'Harbor site not found' })
  @ApiParam({ name: 'id', description: 'Harbor site ID' })
  @ApiBody({ type: UpdateHarborSiteDto })
  update(@Param('id') id: string, @Body() updateHarborSiteDto: UpdateHarborSiteDto) {
    return this.harborSitesService.update(id, updateHarborSiteDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a Harbor site' })
  @ApiResponse({ status: 204, description: 'Harbor site deleted successfully' })
  @ApiResponse({ status: 404, description: 'Harbor site not found' })
  @ApiParam({ name: 'id', description: 'Harbor site ID' })
  remove(@Param('id') id: string) {
    return this.harborSitesService.remove(id);
  }

  @Post('test-connection')
  @ApiOperation({ summary: 'Test connection to a Harbor registry' })
  @ApiResponse({ status: 200, description: 'Connection test result' })
  @ApiBody({ type: TestHarborConnectionDto })
  testConnection(@Body() testConnectionDto: TestHarborConnectionDto) {
    return this.harborSitesService.testConnection(testConnectionDto);
  }

  @Post(':id/activate')
  @ApiOperation({ summary: 'Set a Harbor site as active' })
  @ApiResponse({ status: 200, description: 'Harbor site activated successfully' })
  @ApiResponse({ status: 404, description: 'Harbor site not found' })
  @ApiParam({ name: 'id', description: 'Harbor site ID' })
  activateSite(@Param('id') id: string) {
    return this.harborSitesService.setActive(id, true);
  }

  @Post(':id/deactivate')
  @ApiOperation({ summary: 'Deactivate a Harbor site' })
  @ApiResponse({ status: 200, description: 'Harbor site deactivated successfully' })
  @ApiResponse({ status: 404, description: 'Harbor site not found' })
  @ApiParam({ name: 'id', description: 'Harbor site ID' })
  deactivateSite(@Param('id') id: string) {
    return this.harborSitesService.setActive(id, false);
  }

  @Get(':id/projects')
  @ApiOperation({ summary: 'List projects in Harbor site' })
  @ApiResponse({ status: 200, description: 'Harbor projects list' })
  @ApiParam({ name: 'id', description: 'Harbor site ID' })
  async getProjects(@Param('id') id: string) {
    const site = await this.harborSitesService.findOne(id);
    return this.harborApiService.getProjects(site);
  }

  @Get(':id/repositories/:projectName')
  @ApiOperation({ summary: 'List repositories in Harbor project' })
  @ApiResponse({ status: 200, description: 'Harbor repositories list' })
  @ApiParam({ name: 'id', description: 'Harbor site ID' })
  @ApiParam({ name: 'projectName', description: 'Project name' })
  async getRepositories(@Param('id') id: string, @Param('projectName') projectName: string) {
    const site = await this.harborSitesService.findOne(id);
    return this.harborApiService.getRepositories(site, projectName);
  }

  @Get(':id/artifacts/:projectName/:repositoryName')
  @ApiOperation({ summary: 'List artifacts in Harbor repository' })
  @ApiResponse({ status: 200, description: 'Harbor artifacts list' })
  @ApiParam({ name: 'id', description: 'Harbor site ID' })
  @ApiParam({ name: 'projectName', description: 'Project name' })
  @ApiParam({ name: 'repositoryName', description: 'Repository name' })
  async getArtifacts(
    @Param('id') id: string, 
    @Param('projectName') projectName: string,
    @Param('repositoryName') repositoryName: string
  ) {
    const site = await this.harborSitesService.findOne(id);
    return this.harborApiService.getArtifacts(site, projectName, repositoryName);
  }

  @Get(':id/test-image-size')
  @ApiOperation({ summary: 'Test image size retrieval' })
  @ApiResponse({ status: 200, description: 'Image size test result' })
  @ApiParam({ name: 'id', description: 'Harbor site ID' })
  async testImageSize(
    @Param('id') id: string,
    @Query('imageTag') imageTag: string,
  ) {
    if (!imageTag) {
      return { error: 'imageTag query parameter is required' };
    }
    
    const site = await this.harborSitesService.findOne(id);
    const result = await this.harborApiService.getImageSize(site, imageTag);
    
    return {
      imageTag,
      site: { id: site.id, name: site.name, url: site.url },
      result,
    };
  }
}